import type { CellObject, WorkBook } from 'xlsx'
import { loadXlsx, type XlsxModule } from './loader'

/** 데이터 한 행. rowNumber 는 엑셀 화면에 보이는 번호(헤더가 1행, 첫 데이터는 2행) — 오류 목록이 이 번호를 가리킨다. */
export interface SheetRow {
  rowNumber: number
  cells: string[]
}

export interface SheetData {
  /** 1행의 처음 columnCount 칸(앞뒤 공백 제거). 양식 검사는 호출부가 한다. */
  header: string[]
  /** 2행부터, 모든 칸이 빈 행은 뺀 것. */
  rows: SheetRow[]
}

/** xlsx 가 아니거나(손상·암호화 포함) 시트가 하나도 없을 때. 호출부가 도메인 코드(IMPORT_FILE_UNREADABLE 등)로 바꾼다. */
export class SheetReadError extends Error {
  constructor() {
    super('SHEET_UNREADABLE')
    this.name = 'SheetReadError'
  }
}

interface ReadSheetOptions {
  /** 이 이름의 시트를 읽고, 없으면 첫 시트를 읽는다(스프링과 같은 규칙 — 편한가계부 파일은 시트 이름이 다르다). */
  sheetName: string
  /** 읽을 열 수(A열부터). 그 뒤 열은 무시한다. */
  columnCount: number
}

/**
 * 엑셀 파일의 시트 하나를 "문자열 칸" 행 배열로 읽는다. 셀 해석 규칙은 스프링 `cellText`와 같다:
 * 날짜 서식의 숫자 셀은 `yyyy-MM-dd`, 숫자 셀은 지수 없는 평문(`12000` · `500.02`), 문자열은 앞뒤 공백 제거,
 * 수식 셀은 저장된 결과값. 퍼센트 서식의 숫자 셀만 스프링과 달리 보이는 숫자(`4%` → `4`)로 읽는다. 날짜·금액·이름의 **의미** 해석은 하지 않는다 — DB 함수가 한 곳에서 한다.
 */
export async function readSheet(file: File, { sheetName, columnCount }: ReadSheetOptions): Promise<SheetData> {
  const XLSX = await loadXlsx()
  let workbook: WorkBook
  try {
    // cellNF: 날짜 서식인지 보려면 셀의 숫자 서식(z)이 필요하다. cellDates 는 끈다 — Date 객체로 바꾸면 시간대 보정이 끼어
    // 자정 날짜가 하루 밀릴 수 있어, 엑셀 일련번호를 직접 연·월·일로 푼다(parse_date_code).
    workbook = XLSX.read(await file.arrayBuffer(), { type: 'array', cellNF: true, cellDates: false })
  } catch {
    throw new SheetReadError()
  }
  const name = workbook.Sheets[sheetName] ? sheetName : workbook.SheetNames[0]
  const sheet = name ? workbook.Sheets[name] : undefined
  if (!sheet) throw new SheetReadError()

  const date1904 = workbook.Workbook?.WBProps?.date1904 === true
  const ref = sheet['!ref']
  const lastRow = ref ? XLSX.utils.decode_range(ref).e.r : -1
  const readRow = (r: number): string[] =>
    Array.from({ length: columnCount }, (_, c) =>
      cellText(XLSX, sheet[XLSX.utils.encode_cell({ r, c })] as CellObject | undefined, date1904),
    )

  const header = readRow(0)
  const rows: SheetRow[] = []
  for (let r = 1; r <= lastRow; r++) {
    const cells = readRow(r)
    if (cells.every((cell) => cell === '')) continue
    rows.push({ rowNumber: r + 1, cells })
  }
  return { header, rows }
}

interface SsfDate {
  y: number
  m: number
  d: number
}

// SheetJS 의 SSF 는 타입이 any 라 쓰는 두 함수만 좁혀 둔다.
interface Ssf {
  is_date(format: string): boolean
  parse_date_code(value: number, options?: { date1904?: boolean }): SsfDate | null
}

function cellText(XLSX: XlsxModule, cell: CellObject | undefined, date1904: boolean): string {
  if (!cell) return ''
  switch (cell.t) {
    case 'n': {
      const value = typeof cell.v === 'number' ? cell.v : Number(cell.v)
      if (typeof cell.z === 'string' && (XLSX.SSF as Ssf).is_date(cell.z)) {
        const date = (XLSX.SSF as Ssf).parse_date_code(value, { date1904 })
        return date ? isoDate(date.y, date.m, date.d) : ''
      }
      // 엑셀에 '4%'를 적으면 0.04 에 퍼센트 서식이 붙는다 — 보이는 숫자(4)를 넘긴다. 그대로 넘기면 연이율이 0.04%로 저장된다.
      if (typeof cell.z === 'string' && isPercentFormat(cell.z)) return plainNumber(value * 100)
      return plainNumber(value)
    }
    case 'd':
      return cell.v instanceof Date ? isoDate(cell.v.getFullYear(), cell.v.getMonth() + 1, cell.v.getDate()) : String(cell.v ?? '').trim()
    case 'b':
      return cell.v ? 'TRUE' : 'FALSE'
    case 's':
      return String(cell.v ?? '').trim()
    case 'e':
      return (cell.w ?? '').trim()
    default:
      return ''
  }
}

function isoDate(y: number, m: number, d: number): string {
  return `${String(y).padStart(4, '0')}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`
}

/** 퍼센트 서식(`0%` · `0.0%`)인가. 따옴표 안의 글자와 `\%`는 서식이 아니라 그냥 글자라 100배 하지 않는다(엑셀과 같은 규칙). */
function isPercentFormat(format: string): boolean {
  return format.replace(/"[^"]*"|\\./g, '').includes('%')
}

/** 12000 → "12000", 500.02 → "500.02". 지수 표기·천 단위 구분 없이(스프링 BigDecimal.toPlainString 과 같은 결과). */
function plainNumber(value: number): string {
  if (!Number.isFinite(value)) return ''
  return value.toLocaleString('en-US', { useGrouping: false, maximumFractionDigits: 10 })
}
