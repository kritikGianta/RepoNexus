import toast from 'react-hot-toast'
import { useAuthStore } from '@/stores/auth'

const API_URL = import.meta.env.VITE_API_URL || '/api/v1'

class ApiError extends Error {
  status: number
  requestId?: string

  constructor(message: string, status: number, requestId?: string) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.requestId = requestId
  }
}

function toErrorMessage(detail: unknown): string {
  if (typeof detail === 'string') return detail
  if (Array.isArray(detail)) {
    return detail
      .map((item) => (typeof item === 'string' ? item : item?.msg ? String(item.msg) : JSON.stringify(item)))
      .join('\n')
  }
  if (detail && typeof detail === 'object') {
    const maybeMessage = (detail as { msg?: unknown; detail?: unknown }).msg ?? (detail as { detail?: unknown }).detail
    if (typeof maybeMessage === 'string') return maybeMessage
    try {
      return JSON.stringify(detail)
    } catch {
      return 'Something went wrong'
    }
  }
  return 'Something went wrong'
}

async function request<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const token = useAuthStore.getState().token
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> || {}),
  }

  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }

  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers,
  })

  const requestId = res.headers.get('x-request-id') || undefined

  if (res.status === 401) {
    useAuthStore.getState().logout()
    window.location.href = '/login'
    throw new ApiError('Session expired', 401, requestId)
  }

  if (res.status === 204) {
    return undefined as T
  }

  if (!res.ok) {
    let detail = 'Something went wrong'
    try {
      const body = await res.json()
      detail = toErrorMessage(body.detail ?? body)
    } catch {}
    const err = new ApiError(detail, res.status, requestId)
    toast.error(detail)
    throw err
  }

  return res.json()
}

export const api = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: 'POST', body: body ? JSON.stringify(body) : undefined }),
  patch: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: 'PATCH', body: body ? JSON.stringify(body) : undefined }),
  delete: <T>(path: string) => request<T>(path, { method: 'DELETE' }),
}

export { ApiError }
