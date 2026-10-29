import { ApiError } from '../api'
import { errorMessageOf } from '../errorMessages'
import { rpc } from '../supabase'
import { buildWorkbook, XlsxLoadError } from '@/utils/xlsx'
import type { ExportFileParams, ExportFileResult, ExportKind } from './export.type'

/** DB 함수(export_*)가 돌려주는 모양 — 열 순서·라벨은 스프링 POI 시트와 같다(20261024000007_app_api.sql 4부). */
interface ExportSheetPayload {
  headers: string[]
  rows: (string | number)[][]
}

// 스프링이 만들던 시트 이름 그대로. 계좌는 가져오기 양식과 같은 '계좌' 시트라 내보낸 파일을 그대로 다시 올릴 수 있다.
const EXPORT_SHEET_NAME: Record<ExportKind, string> = {
  transactions: 'transactions',
  trades: 'trades',
  accounts: '계좌',
}

/**
 * 거래·매매·계좌를 xlsx 로 만든다. 행은 DB 함수가, 파일은 앱(SheetJS)이 만든다 — 성공하면 { blob, filename }을 돌려주고
 * 실제 저장(saveFile)은 훅에서 한다. 기간은 거래·매매에만 실리고 계좌는 항상 전체다.
 */
export async function downloadExportFile(kind: ExportKind, params: ExportFileParams = {}): Promise<ExportFileResult> {
  const payload =
    kind === 'accounts'
      ? await rpc<ExportSheetPayload>('export_accounts')
      : await rpc<ExportSheetPayload>(`export_${kind}`, { p_from: params.from ?? null, p_to: params.to ?? null })
  let blob: Blob
  try {
    blob = await buildWorkbook([{ name: EXPORT_SHEET_NAME[kind], rows: [payload.headers, ...payload.rows] }])
  } catch (error) {
    const code = error instanceof XlsxLoadError ? 'EXCEL_MODULE_UNAVAILABLE' : 'EXPORT_FAILED'
    throw new ApiError(code, errorMessageOf(code), error instanceof XlsxLoadError ? 503 : 500)
  }
  return { blob, filename: exportFilename(kind, params) }
}

/**
 * 스프링 Content-Disposition 과 같은 파일명: `transactions.xlsx` · `accounts.xlsx` ·
 * `trades_{from|all}_{to|오늘}.xlsx`(yyyyMMdd — from 을 생략하면 all, to 를 생략하면 내려받은 날짜).
 */
export function exportFilename(kind: ExportKind, params: ExportFileParams = {}): string {
  if (kind !== 'trades') return `${kind}.xlsx`
  const start = params.from ? compactDate(params.from) : 'all'
  const end = params.to ? compactDate(params.to) : compactDate(todayIsoDate())
  return `trades_${start}_${end}.xlsx`
}

/** 'yyyy-MM-dd' → 'yyyyMMdd' */
function compactDate(isoDate: string): string {
  return isoDate.replaceAll('-', '')
}

function todayIsoDate(): string {
  const today = new Date()
  const y = today.getFullYear()
  const m = String(today.getMonth() + 1).padStart(2, '0')
  const d = String(today.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}
