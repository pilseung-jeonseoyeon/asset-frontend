import { loadXlsx } from './loader'

/** null 은 빈 칸(셀을 만들지 않음). 숫자는 숫자 셀, 문자열은 그대로 — 날짜는 'yyyy-MM-dd' 문자열로 넣는다(스프링과 동일). */
export type CellValue = string | number | null

export interface WorkbookSheet {
  /** 엑셀 시트 이름(31자 이하, `[]:*?/\` 금지). */
  name: string
  /** 1행이 헤더. */
  rows: CellValue[][]
}

export const XLSX_MIME_TYPE = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'

/** 시트 배열을 xlsx 파일(Blob)로 만든다. 저장은 `saveFile` 이 한다. */
export async function buildWorkbook(sheets: WorkbookSheet[]): Promise<Blob> {
  const XLSX = await loadXlsx()
  const workbook = XLSX.utils.book_new()
  for (const { name, rows } of sheets) {
    const sheet = XLSX.utils.aoa_to_sheet(rows)
    sheet['!cols'] = columnWidths(rows)
    XLSX.utils.book_append_sheet(workbook, sheet, name)
  }
  const bytes = XLSX.write(workbook, { bookType: 'xlsx', type: 'array', compression: true }) as ArrayBuffer
  return new Blob([bytes], { type: XLSX_MIME_TYPE })
}

/** 열 너비는 그 열에서 가장 긴 값 기준(한글은 2칸) — 열자마자 읽히도록. 8~40칸. */
function columnWidths(rows: CellValue[][]) {
  const widths: number[] = []
  for (const row of rows) {
    row.forEach((cell, index) => {
      widths[index] = Math.max(widths[index] ?? 0, displayWidth(cell))
    })
  }
  return widths.map((width) => ({ wch: Math.min(40, Math.max(8, width + 2)) }))
}

function displayWidth(cell: CellValue): number {
  if (cell === null) return 0
  let width = 0
  for (const ch of String(cell)) width += ch.charCodeAt(0) > 0x7f ? 2 : 1
  return width
}
