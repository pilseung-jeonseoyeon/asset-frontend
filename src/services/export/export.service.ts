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

// 시트 이름은 한글(2026-10-31 사용자 결정). 계좌는 가져오기 양식과 같은 '계좌' 시트라 내보낸 파일을 그대로 다시 올릴 수 있다.
// 거래 내보내기는 가져오기 양식과 열이 달라 다시 올리는 파일이 아니다(가져오기는 '거래내역' 시트가 있으면 그 시트를 읽는다).
const EXPORT_SHEET_NAME: Record<ExportKind, string> = {
  transactions: '거래내역',
  trades: '매매내역',
  accounts: '계좌',
}

/** 파일명 가운데 부분 — `Monit_{이것}_{기간}.xlsx`. */
const EXPORT_FILE_LABEL: Record<ExportKind, string> = {
  transactions: '가계부_거래내역',
  trades: '주식_매매내역',
  accounts: '계좌_목록',
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
 * 내려받는 파일명(2026-10-31 사용자 결정 — `Monit_` + 한글, 기간은 실제 날짜, yyyyMMdd):
 * - 기간 있음: `Monit_가계부_거래내역_20260731-20261031.xlsx`(to 를 생략하면 내려받은 날짜)
 * - 전체 기간(from 생략): `Monit_가계부_거래내역_전체_20261031.xlsx` — 그 날짜까지의 전부
 * - 계좌 목록(기간 없음): `Monit_계좌_목록_20261031.xlsx` — 내려받은 날짜
 */
export function exportFilename(kind: ExportKind, params: ExportFileParams = {}): string {
  const prefix = `Monit_${EXPORT_FILE_LABEL[kind]}`
  const end = compactDate(params.to ?? todayIsoDate())
  if (kind === 'accounts') return `${prefix}_${compactDate(todayIsoDate())}.xlsx`
  if (!params.from) return `${prefix}_전체_${end}.xlsx`
  return `${prefix}_${compactDate(params.from)}-${end}.xlsx`
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
