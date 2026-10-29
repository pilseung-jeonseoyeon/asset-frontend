// 서버가 내려주는 실패 코드(ACCOUNT_NOT_FOUND 등)를 호출부에서 분기할 수 있도록 보존하는 에러 타입.
// Supabase(PostgREST·Auth·Edge Function) 오류는 supabaseError.ts 가 이 타입으로 바꾸고, 문구는 errorMessages.ts 사전이 정본이다.
// tsconfig의 erasableSyntaxOnly가 켜져 있어 파라미터 프로퍼티(constructor(readonly code))는 쓸 수 없다.
export class ApiError extends Error {
  code: string
  status?: number

  constructor(code: string, message: string, status?: number) {
    super(message)
    this.name = 'ApiError'
    this.code = code
    this.status = status
  }
}
