// 인증 코드 재발송 쿨다운. 버튼이 실제 엔드포인트(postSignupCode / postPasswordResetCode)를
// 부르므로 연타를 막아야 한다. 30초는 판단으로 정한 값이다 — 실제 메일 발송을 두 번 누르는 걸
// 막을 만큼 길고, 코드를 정말 못 받은 사람이 답답하지 않을 만큼 짧게.

import { useEffect, useState } from 'react'

const RESEND_COOLDOWN_MS = 30_000

/** sentAt(ms epoch) 이후 남은 재발송 대기 초. 대기 중이 아니면 0. */
export function useResendCooldown(sentAt: number | null): number {
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    if (!sentAt) return
    const id = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(id)
  }, [sentAt])

  if (!sentAt) return 0
  const remain = Math.ceil((sentAt + RESEND_COOLDOWN_MS - now) / 1000)
  return remain > 0 ? remain : 0
}
