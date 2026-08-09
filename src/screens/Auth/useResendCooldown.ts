// No source equivalent — dc.html's code screen (L640) hardcodes a static "04:32 남음" caption with no
// working timer. Real resend spam-guard needed once the button calls a real endpoint (postSignupCode /
// postPasswordResetCode), so this is new. 30s is a judgment call (not specified by the task or the
// design doc) — long enough to discourage double-clicking a real mail send, short enough that a user
// who genuinely didn't get the code isn't stuck waiting.

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
