import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { queryKeys } from '../queryKeys'
import {
  deleteConnection,
  getConnections,
  postConnection,
  postConnectionSync,
} from './connection.service'
import type { CreateConnectionRequest } from './connection.type'

interface QueryOptions {
  enabled?: boolean
}

export function useGetConnections(options?: QueryOptions) {
  const query = useQuery({
    queryKey: queryKeys.connection.list(),
    queryFn: getConnections,
    enabled: options?.enabled,
  })
  return { ...query, connections: query.data ?? [] }
}

/**
 * 연동 등록. 이 단계에서는 아직 계좌도 매매도 생기지 않으므로(첫 동기화가 만든다)
 * connection 캐시만 무효화한다.
 */
export function usePostConnection() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (body: CreateConnectionRequest) => postConnection(body),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.connection.all() })
    },
  })
}

/**
 * 동기화. 계좌가 새로 생기고 매매가 들어오므로 넓게 무효화한다.
 *
 * 이 백엔드는 잔액·평단·손익을 매 요청마다 원장에서 재계산하므로(queryKeys.ts 상단 주석),
 * 매매 1건이 account·asset·trade·stock·dashboard를 동시에 흔든다. 좁게 잡으면 동기화 직후
 * 자산 화면 금액과 주식 화면 보유 종목이 서로 어긋난 채로 남는다.
 */
export function usePostConnectionSync() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (connectionId: number) => postConnectionSync(connectionId),
    onSuccess: () => {
      for (const key of [
        queryKeys.connection.all(),
        queryKeys.account.all(),
        queryKeys.asset.all(),
        queryKeys.trade.all(),
        queryKeys.stock.all(),
        queryKeys.dashboard.all(),
        // 목표 진행률도 실시간 총자산 기준이라 동기화로 잔액·보유가 바뀌면 함께 다시 받는다.
        queryKeys.goal.all(),
        // 매매 정산으로 예수금 거래가 생길 수 있어 계좌 상세의 거래내역도 다시 받는다.
        queryKeys.transaction.all(),
      ]) {
        void queryClient.invalidateQueries({ queryKey: key })
      }
    },
  })
}

/**
 * 연동 삭제. 서버는 이미 만들어진 계좌·매매 내역을 지우지 않으므로
 * account/trade 캐시는 건드리지 않는다.
 */
export function useDeleteConnection() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (connectionId: number) => deleteConnection(connectionId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.connection.all() })
    },
  })
}
