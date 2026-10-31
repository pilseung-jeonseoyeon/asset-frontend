import { ApiError } from '../api'
import { errorMessageOf } from '../errorMessages'
import { rpc, supabase, unwrapResult } from '../supabase'
import { buildWorkbook, readSheet, SheetReadError, XlsxLoadError } from '@/utils/xlsx'
import type { CellValue, SheetRow, WorkbookSheet } from '@/utils/xlsx'
import type { AccountType, CategoryKind } from '../common.type'
import type { ImportKind, ImportTemplateResult, ImportTransactionsResult } from './import.type'

// 엑셀 파일은 앱이 만들고 읽는다(SheetJS). 검증·이름 → id 매칭·"한 행이라도 틀리면 전부 안 됨"은 DB 함수
// import_transactions / import_accounts 가 한다(docs/excel-import.md). 시트 이름·헤더·예시 행은 스프링
// ExcelConstants · LedgerFacadeService · AccountFacadeService 와 같다 — 예전에 받아 둔 양식 파일도 그대로 올라간다.

const TEMPLATE_FILENAME: Record<ImportKind, string> = {
  transactions: 'Monit_가계부_템플릿.xlsx',
  accounts: 'Monit_계좌_템플릿.xlsx',
}

/** 양식 2번 시트 — 입력 시트의 이름 칸은 이 시트의 값과 정확히 같아야 한다. */
const REFERENCE_SHEET_NAME = '등록된 이름'

/** 스프링 multipart 상한과 같다. DB 함수의 5,000행 상한은 따로 있다. */
const MAX_IMPORT_FILE_BYTES = 5 * 1024 * 1024

const TRANSACTION_HEADERS = ['날짜', '계좌', '대분류', '소분류', '내용', '금액', '구분', '메모', '상대계좌'] as const
const ACCOUNT_HEADERS = ['계좌명', '유형', '기관', '원화예수금', '달러예수금', '연이율(%)', '개설일', '만기일', '즉시현금화'] as const

interface ImportSpec {
  /** 이 시트가 없으면 첫 시트를 읽는다. */
  sheetName: string
  headers: readonly string[]
  /** 1행 헤더 검사 열 수 — 거래는 편한가계부 내보내기 파일(A~H)도 받으므로 8, 계좌는 전부. */
  requiredHeaderCount: number
  unreadableCode: 'IMPORT_FILE_UNREADABLE' | 'ACCOUNT_IMPORT_FILE_UNREADABLE'
  rpcName: 'import_transactions' | 'import_accounts'
  /** 셀 문자열 → DB 함수가 읽는 키(p_rows 원소). 값은 전부 문자열이고 해석은 DB 가 한다. */
  toRow: (row: SheetRow) => Record<string, string | number>
}

const IMPORT_SPECS: Record<ImportKind, ImportSpec> = {
  transactions: {
    sheetName: '거래내역',
    headers: TRANSACTION_HEADERS,
    requiredHeaderCount: 8,
    unreadableCode: 'IMPORT_FILE_UNREADABLE',
    rpcName: 'import_transactions',
    toRow: ({ rowNumber, cells: [date, account, category, subcategory, description, amount, type, memo, transferAccount] }) => ({
      rowNumber,
      date,
      account,
      category,
      subcategory,
      description,
      amount,
      type,
      memo,
      transferAccount,
    }),
  },
  accounts: {
    sheetName: '계좌',
    headers: ACCOUNT_HEADERS,
    requiredHeaderCount: ACCOUNT_HEADERS.length,
    unreadableCode: 'ACCOUNT_IMPORT_FILE_UNREADABLE',
    rpcName: 'import_accounts',
    toRow: ({ rowNumber, cells: [name, type, institution, balanceKrw, balanceUsd, interestRate, openedAt, maturityDate, isLiquid] }) => ({
      rowNumber,
      name,
      type,
      institution,
      balanceKrw,
      balanceUsd,
      interestRate,
      openedAt,
      maturityDate,
      isLiquid,
    }),
  },
}

/**
 * 엑셀 파일을 읽어 행을 DB 함수에 넘긴다. 앱이 하는 검사는 두 가지뿐 — 파일 크기(5MB)와 1행 헤더가 양식과 같은지.
 * 나머지(날짜·금액·구분·이름 매칭·거래 규칙)는 DB 함수가 행마다 검사해 틀린 행 목록을 돌려주고, 하나라도 틀리면 아무것도 넣지 않는다.
 * 응답은 전체 성공(errors 빈 배열) 또는 전체 롤백(importedCount 0 + errors) 둘 중 하나다(import.type.ts 참고).
 */
export async function uploadImportFile(kind: ImportKind, file: File): Promise<ImportTransactionsResult> {
  const spec = IMPORT_SPECS[kind]
  if (file.size > MAX_IMPORT_FILE_BYTES) {
    throw new ApiError('INVALID_INPUT', '파일이 너무 커요. 5MB 이하의 xlsx 파일만 올릴 수 있어요.', 400)
  }
  let sheet
  try {
    sheet = await readSheet(file, { sheetName: spec.sheetName, columnCount: spec.headers.length })
  } catch (error) {
    if (error instanceof SheetReadError) throw unreadable(spec)
    if (error instanceof XlsxLoadError) throw new ApiError('EXCEL_MODULE_UNAVAILABLE', errorMessageOf('EXCEL_MODULE_UNAVAILABLE'), 503)
    throw error
  }
  const headerMatches = spec.headers.slice(0, spec.requiredHeaderCount).every((label, index) => sheet.header[index] === label)
  if (!headerMatches) throw unreadable(spec)
  return rpc<ImportTransactionsResult>(spec.rpcName, { p_rows: sheet.rows.map(spec.toRow) })
}

function unreadable(spec: ImportSpec): ApiError {
  return new ApiError(spec.unreadableCode, errorMessageOf(spec.unreadableCode), 400)
}

/**
 * 가져오기용 엑셀 양식을 만든다. 두 시트 — 1번 입력 시트(헤더 + 그대로 올려도 등록되는 예시 1행)와
 * 2번 `등록된 이름`(이 사용자의 계좌·대분류·소분류 또는 유형·기관 목록). 실제 저장은 훅에서 한다.
 */
export async function downloadImportTemplate(kind: ImportKind): Promise<ImportTemplateResult> {
  const sheets = kind === 'transactions' ? await transactionTemplateSheets() : await accountTemplateSheets()
  try {
    return { blob: await buildWorkbook(sheets), filename: TEMPLATE_FILENAME[kind] }
  } catch (error) {
    const code = error instanceof XlsxLoadError ? 'EXCEL_MODULE_UNAVAILABLE' : 'IMPORT_TEMPLATE_FAILED'
    throw new ApiError(code, errorMessageOf(code), error instanceof XlsxLoadError ? 503 : 500)
  }
}

interface NamedRow {
  name: string
}

interface CategoryRow {
  kind: CategoryKind
  name: string
  subcategories: NamedRow[]
}

/** 구분(G열) 라벨 — DB private.import_tx_type 이 받는 한글. */
const KIND_LABEL: Record<CategoryKind, string> = { INCOME: '수입', EXPENSE: '지출', SAVING: '저축' }

/** 유형(B열) 라벨 — DB private.import_account_type 이 받는 한글. 순서는 스프링 AccountType 열거 순서. */
const ACCOUNT_TYPE_LABELS: Record<AccountType, string> = {
  CASH: '현금',
  DEPOSIT: '예적금',
  STOCK: '주식',
  CRYPTO: '가상자산',
  PENSION_ETC: '연금·기타',
}

async function transactionTemplateSheets(): Promise<WorkbookSheet[]> {
  // 도메인 폴더끼리 import 하지 않는 규칙 때문에 account·category 서비스 대신 같은 DB 함수를 직접 부른다(이름만 쓴다).
  const [accounts, categories] = await Promise.all([
    rpc<NamedRow[]>('get_accounts', { p_type: null, p_institution_id: null, p_include_closed: false }),
    rpc<CategoryRow[]>('get_categories', { p_kind: null }),
  ])
  const combos = categories.flatMap((category) =>
    category.subcategories.map((sub): CellValue[] => [KIND_LABEL[category.kind], category.name, sub.name]),
  )
  return [
    { name: IMPORT_SPECS.transactions.sheetName, rows: [[...TRANSACTION_HEADERS], transactionExampleRow(accounts, categories)] },
    {
      name: REFERENCE_SHEET_NAME,
      rows: [['계좌', null, '구분', '대분류', '소분류'], ...sideBySide(accounts.map((a) => [a.name]), combos, 3)],
    },
  ]
}

/** 그대로 올려도 등록되도록 내 첫 계좌와 첫 지출 대분류·소분류로 예시를 채운다(스프링 buildTemplateExampleRow). 날짜는 오늘. */
function transactionExampleRow(accounts: NamedRow[], categories: CategoryRow[]): CellValue[] {
  const accountName = accounts[0]?.name ?? '국민 주거래'
  const withSubcategories = categories.filter((category) => category.subcategories.length > 0)
  const category = withSubcategories.find((candidate) => candidate.kind === 'EXPENSE') ?? withSubcategories[0]
  if (!category) return [todayIsoDate(), accountName, '식비', '외식', '점심', '12000', '지출', '회사 근처', '']
  return [todayIsoDate(), accountName, category.name, category.subcategories[0].name, '점심', '12000', KIND_LABEL[category.kind], '회사 근처', '']
}

async function accountTemplateSheets(): Promise<WorkbookSheet[]> {
  const institutions = unwrapResult(await supabase.from('institutions').select('name').order('id').returns<NamedRow[]>()) ?? []
  const typeLabels = (Object.keys(ACCOUNT_TYPE_LABELS) as AccountType[]).map((type): CellValue[] => [ACCOUNT_TYPE_LABELS[type]])
  const example: CellValue[] = ['증권계좌', ACCOUNT_TYPE_LABELS.STOCK, institutions[0]?.name ?? '', '1000000', '500.02', '', '2026-01-02', '', 'Y']
  return [
    { name: IMPORT_SPECS.accounts.sheetName, rows: [[...ACCOUNT_HEADERS], example] },
    { name: REFERENCE_SHEET_NAME, rows: [['유형', null, '기관'], ...sideBySide(typeLabels, institutions.map((i) => [i.name]), 1)] },
  ]
}

/** 스프링 양식처럼 왼쪽 목록(A열)과 오른쪽 목록(C열부터)이 같은 행을 나눠 쓴다 — 사이 B열은 비운다. */
function sideBySide(left: CellValue[][], right: CellValue[][], rightWidth: number): CellValue[][] {
  const length = Math.max(left.length, right.length)
  return Array.from({ length }, (_, index) => [
    left[index]?.[0] ?? null,
    null,
    ...(right[index] ?? Array.from({ length: rightWidth }, (): CellValue => null)),
  ])
}

function todayIsoDate(): string {
  const today = new Date()
  const y = today.getFullYear()
  const m = String(today.getMonth() + 1).padStart(2, '0')
  const d = String(today.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}
