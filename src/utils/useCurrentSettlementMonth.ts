// "이번 달"(오늘이 속한 정산월)을 화면에 돌려준다.
//
// 정본은 서버의 GET /users/me/settlements/current다. 응답이 오기 전(앱을 막 열었을 때)에는 사용자
// 설정의 monthStartDay로 같은 규칙을 계산해 채운다 — 로딩 동안 달력 월로 잘못 조회했다가 다시 바뀌는
// 깜빡임을 줄이기 위함이다. 설정도 아직 없으면 monthStartDay 1(=달력 월)로 계산된다.

import { useEffect } from 'react'
import { settlementMonthOf, toISODate } from './date'
import type { YearMonthCursor } from './date'
import { useGetCurrentSettlement, useGetUserSettings } from '@/services/user'

export function useCurrentSettlementMonth(): YearMonthCursor {
  const { data } = useGetCurrentSettlement()
  const { settings } = useGetUserSettings()
  const local = settlementMonthOf(toISODate(new Date()), settings.monthStartDay)

  // 서버와 로컬 계산이 어긋나면 서버가 정산월 라벨링 규칙을 바꾼 것이다 — 달력·주간 뷰는 로컬 계산
  // (settlementMonthOf)을 쓰므로 date.ts도 같이 고쳐야 한다. 설정을 막 바꾼 직후 두 쿼리가 서로 다른
  // 시점 값을 들고 있을 수도 있어 화면을 막지는 않고 개발용 경고만 남긴다.
  const mismatch = data !== undefined && (data.year !== local.year || data.month !== local.month)
  useEffect(() => {
    if (mismatch && import.meta.env.DEV) {
      console.warn('[settlement] 서버 현재 정산월과 로컬 계산이 다릅니다 — src/utils/date.ts의 settlementMonthOf 규칙을 확인하세요.')
    }
  }, [mismatch])

  return data ? { year: data.year, month: data.month } : local
}
