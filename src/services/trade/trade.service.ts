import { ApiError } from '../api'
import { errorMessageOf } from '../errorMessages'
import { currentUserId, rpc, supabase, unwrapResult } from '../supabase'
import type { Page, TradeSearchParams } from '../common.type'
import type { CreateTradeRequest, TradeResponse, UpdateTradeRequest } from './trade.type'

/** size 생략 시 조건에 맞는 전 건을 한 페이지로(최대 200). 정렬은 체결일·id 내림차순으로 서버가 고정한다. */
export async function getTrades(params: TradeSearchParams = {}) {
  return rpc<Page<TradeResponse>>('list_trades', {
    p: { accountId: params.accountId, stockId: params.stockId, from: params.from, to: params.to, page: params.page, size: params.size },
  })
}

/** 체결일 기준 보유 수량을 넘겨 매도하면 INSUFFICIENT_HOLDING. settleCash 면 예수금 정산 거래도 함께 만든다. */
export async function postTrade(body: CreateTradeRequest) {
  return rpc<TradeResponse>('create_trade', { p: body })
}

/** PUT 은 전체 교체 — 세금·환율·메모를 다시 실어야 한다. 정산 거래는 트리거가 따라 고친다. 계좌·종목은 바꿀 수 없다. */
export async function putTrade(tradeId: number, body: UpdateTradeRequest) {
  const uid = await currentUserId()
  const updated = unwrapResult(
    await supabase
      .from('trades')
      .update({
        side: body.side,
        quantity: body.quantity,
        price: body.price,
        fee: body.fee ?? 0,
        tax: body.tax ?? 0,
        exchange_rate: body.exchangeRate ?? null,
        trade_date: body.tradeDate,
        memo: body.memo ?? null,
      })
      .eq('id', tradeId)
      .eq('user_id', uid)
      .select('id'),
  )
  if (!updated || updated.length === 0) throw new ApiError('TRADE_NOT_FOUND', errorMessageOf('TRADE_NOT_FOUND'), 404)
  return rpc<TradeResponse>('get_trade', { p_id: tradeId })
}

/** 정산 거래는 FK cascade 로 함께 지워진다. */
export async function deleteTrade(tradeId: number) {
  const uid = await currentUserId()
  const deleted = unwrapResult(await supabase.from('trades').delete().eq('id', tradeId).eq('user_id', uid).select('id'))
  if (!deleted || deleted.length === 0) throw new ApiError('TRADE_NOT_FOUND', errorMessageOf('TRADE_NOT_FOUND'), 404)
}
