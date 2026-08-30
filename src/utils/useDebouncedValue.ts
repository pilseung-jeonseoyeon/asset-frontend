// 입력창처럼 사용자가 타이핑하는 값을 그대로 서버 조회에 쓰면 글자마다 요청이 나간다. 잠시 멈출
// 때까지 기다렸다가 마지막 값만 흘려보낸다.

import { useEffect, useState } from 'react'

export function useDebouncedValue<T>(value: T, delayMs = 300): T {
  const [debounced, setDebounced] = useState(value)

  useEffect(() => {
    const timer = window.setTimeout(() => setDebounced(value), delayMs)
    return () => window.clearTimeout(timer)
  }, [value, delayMs])

  return debounced
}
