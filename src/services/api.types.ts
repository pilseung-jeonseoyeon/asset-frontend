// 백엔드 공통 응답 봉투. 실제 서버 응답을 확인해 맞춘 구조다(secret/API-SPEC.md "공통 규격").
//   성공: { "success": true, "data": { ... } }
//   실패: { "success": false, "error": { "code": "...", "message": "..." } }
// 성공/실패를 유니온 하나로 합치지 않는 이유: axios가 비-2xx를 reject하므로 서비스 함수 본문에서는
// 성공 형태만 다루면 되고, 유니온이면 모든 서비스 함수에 불필요한 narrowing이 생긴다.

export interface ApiResponse<T> {
  success: true
  // 서버가 @JsonInclude(NON_NULL)이라 204/Void 응답에서는 data 키 자체가 없다.
  data?: T
}

export interface ApiErrorPayload {
  success: false
  error: {
    code: string
    message: string
  }
}
