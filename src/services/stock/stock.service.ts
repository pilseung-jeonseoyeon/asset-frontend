import { ApiError } from '../api'
import { errorMessageOf } from '../errorMessages'
import { rpc, supabase, unwrapResult } from '../supabase'
import type { Market } from '../common.type'
import type {
  ClosedHoldingResponse,
  CreateStockRequest,
  HoldingGroupResponse,
  HoldingResponse,
  StockResponse,
  StockSectorResponse,
} from './stock.type'

const STOCK_COLUMNS = 'id, ticker, name, market, sector, currency'

/**
 * 종목 검색 — 이름·티커 부분일치(대소문자 무시). 서버(search_stocks, 000021)가 정확히 같음 → 앞글자 같음 → 포함 순,
 * 같은 단계 안에서는 시가총액 큰 순으로 매겨 최대 50개를 준다. markets를 주면 그 시장만(자르기 전에 거른다).
 */
export async function getStocks(keyword?: string, markets?: readonly Market[]) {
  return rpc<StockResponse[]>('search_stocks', { p_keyword: keyword?.trim() || null, p_markets: markets?.length ? markets : null })
}

export async function getStockSectors() {
  return rpc<StockSectorResponse[]>('get_stock_sectors')
}

/** 종목 등록(전역 마스터). 같은 시장·티커가 있으면 STOCK_DUPLICATE. */
export async function postStock(body: CreateStockRequest) {
  const { data, error } = await supabase
    .from('stocks')
    .insert({ ticker: body.ticker, name: body.name, market: body.market, sector: body.sector ?? null, currency: body.currency })
    .select(STOCK_COLUMNS)
    .single<StockResponse>()
  if (error) {
    if (error.code === '23505') throw new ApiError('STOCK_DUPLICATE', errorMessageOf('STOCK_DUPLICATE'), 409)
    return unwrapResult<StockResponse>({ data: null, error })
  }
  if (!data) throw new ApiError('STOCK_NOT_FOUND', errorMessageOf('STOCK_NOT_FOUND'), 404)
  return data
}

/** 해외 종목 보유 시 환율이 없으면 FX_RATE_NOT_FOUND — 에러가 아니라 미준비 상태로 다룰 것(훅이 1회 수집을 요청한다). */
/** accountId를 주면 그 계좌의 보유 종목만 온다(매도 수량 상한을 계좌별로 잡을 때 쓴다). */
export async function getHoldings(market?: Market, accountId?: number) {
  return rpc<HoldingResponse[]>('get_holdings', { p_account_id: accountId ?? null, p_market: market ?? null })
}

/** by는 화면에서 소문자로 오고, DB 함수는 대문자(SECTOR·MARKET)를 받는다. */
export async function getHoldingGroups(by: 'sector' | 'market') {
  return rpc<HoldingGroupResponse[]>('get_holding_groups', { p_by: by.toUpperCase() })
}

export async function getClosedHoldings(market?: Market) {
  return rpc<ClosedHoldingResponse[]>('get_closed_holdings', { p_market: market ?? null })
}
