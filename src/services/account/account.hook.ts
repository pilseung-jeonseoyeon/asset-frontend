import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { queryKeys } from '../queryKeys'
import type { AccountListParams } from '../common.type'
import {
  deleteAccount,
  getAccount,
  getAccounts,
  patchAccount,
  patchAccountBalance,
  postAccount,
} from './account.service'
import type {
  AdjustBalanceRequest,
  CreateAccountRequest,
  UpdateAccountRequest,
} from './account.type'

export function useGetAccounts(
  params: AccountListParams = {},
  options?: { enabled?: boolean },
) {
  return useQuery({
    queryKey: queryKeys.account.list(params),
    queryFn: () => getAccounts(params),
    enabled: options?.enabled,
  })
}

export function useGetAccount(accountId: number | null) {
  return useQuery({
    queryKey: queryKeys.account.detail(accountId ?? 0),
    queryFn: () => getAccount(accountId as number),
    enabled: accountId !== null,
  })
}


/**
 * 계좌·스냅샷이 바뀌면 서버가 잔액을 다시 계산하므로 자산 분포/대시보드까지 함께 무효화한다.
 * 기관은 "활성 계좌 보유 여부"가 달라져 삭제 가능 상태가 바뀌므로 포함한다.
 *
 * 매매(trade)·보유 종목(stock)도 함께 지운다: 계좌 등록이 holdings를 함께 받으면 서버가 그만큼 BUY
 * 매매를 만들고(CreateAccountReq.holdings), 계좌를 지우면 그 매매도 함께 사라지므로 주식 화면이 옛
 * 목록을 그대로 들고 있으면 안 된다.
 *
 * 목표(goal)도 포함한다: GoalResponse.annual은 "실시간 총자산 기준" 진행률이라(goal.type.ts) 계좌
 * 하나만 추가해도 값이 달라진다. 이게 빠지면 총자산 히어로·도넛은 즉시 갱신되는데 대시보드
 * 목표 카드만 옛 진행률로 남는다.
 */
function useInvalidateAccount() {
  const queryClient = useQueryClient()
  return () => {
    void queryClient.invalidateQueries({ queryKey: queryKeys.account.all() })
    void queryClient.invalidateQueries({ queryKey: queryKeys.asset.all() })
    void queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.all() })
    void queryClient.invalidateQueries({ queryKey: queryKeys.institution.all() })
    void queryClient.invalidateQueries({ queryKey: queryKeys.stock.all() })
    void queryClient.invalidateQueries({ queryKey: queryKeys.trade.all() })
    void queryClient.invalidateQueries({ queryKey: queryKeys.goal.all() })
  }
}

export function usePostAccount() {
  const invalidate = useInvalidateAccount()
  return useMutation({
    mutationFn: (body: CreateAccountRequest) => postAccount(body),
    onSuccess: invalidate,
  })
}

export function usePatchAccount() {
  const invalidate = useInvalidateAccount()
  return useMutation({
    mutationFn: ({ id, body }: { id: number; body: UpdateAccountRequest }) =>
      patchAccount(id, body),
    onSuccess: invalidate,
  })
}

export function useDeleteAccount() {
  const invalidate = useInvalidateAccount()
  return useMutation({
    mutationFn: (accountId: number) => deleteAccount(accountId),
    onSuccess: invalidate,
  })
}

/**
 * 잔액 정정이 바꾸는 것은 계좌 잔액과 총자산뿐이다. 차액만큼 ADJUSTMENT 거래가 생기기는 하지만
 * 서버가 그 유형을 가계부 목록·수지 집계에서 모두 제외하므로(account.type.ts 참고) 가계부 쿼리는
 * 무효화하지 않는다 — 화면에 바뀌는 것이 없는데 다시 받아올 이유가 없다. 기관은 활성 계좌 보유
 * 여부가 바뀌지 않으므로(계좌 자체는 그대로 유지) useInvalidateAccount와 달리 포함하지 않는다.
 */
function useInvalidateAccountBalance() {
  const queryClient = useQueryClient()
  return () => {
    void queryClient.invalidateQueries({ queryKey: queryKeys.account.all() })
    void queryClient.invalidateQueries({ queryKey: queryKeys.asset.all() })
    void queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.all() })
  }
}

export function usePatchAccountBalance() {
  const invalidate = useInvalidateAccountBalance()
  return useMutation({
    mutationFn: ({ id, body }: { id: number; body: AdjustBalanceRequest }) =>
      patchAccountBalance(id, body),
    onSuccess: invalidate,
  })
}

