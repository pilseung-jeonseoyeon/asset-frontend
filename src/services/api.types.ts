export interface ApiResponse<T> {
  success: boolean
  code: string
  message: string
  data: T
}

export interface ApiErrorPayload {
  success: false
  code: string
  message: string
}
