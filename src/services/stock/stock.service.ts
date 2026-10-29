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
  UpdateStockRequest,
} from './stock.type'

const STOCK_COLUMNS = 'id, ticker, name, market, sector, currency'

/** 종목 검색 — 이름·티커 부분일치(대소문자 무시), 시장·이름 순. 키워드가 비면 전체(StockRepositoryImpl.search). */
export async function getStocks(keyword?: string) {
  let query = supabase.from('stocks').select(STOCK_COLUMNS).order('market').order('name')
  const kw = keyword?.trim().replace(/[,()"\\]/g, '') // PostgREST or 필터 구문을 깨는 문자는 뺀다
  if (kw) query = query.or(`name.ilike.%${kw}%,ticker.ilike.%${kw}%`)
  return unwrapResult(await query.returns<StockResponse[]>())
}

export async function getStockSectors() {
  return rpc<StockSectorResponse[]>('get_stock_sectors')
}

export async function putStock(stockId: number, body: UpdateStockRequest) {
  const rows = unwrapResult(
    await supabase.from('stocks').update({ name: body.name, sector: body.sector }).eq('id', stockId).select(STOCK_COLUMNS).returns<StockResponse[]>(),
  )
  if (!rows || rows.length === 0) throw new ApiError('STOCK_NOT_FOUND', errorMessageOf('STOCK_NOT_FOUND'), 404)
  return rows[0]
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
