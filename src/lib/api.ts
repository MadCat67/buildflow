const API_BASE = '/api'

export type User = {
  id: string
  email: string
  name: string | null
  avatarUrl: string | null
}

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    credentials: 'include',
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  })

  if (!res.ok) {
    throw new Error(`API error: ${res.status}`)
  }

  return res.json() as Promise<T>
}

export async function getMe(): Promise<{ user: User | null }> {
  try {
    return await request<{ user: User | null }>('/auth/me')
  } catch {
    return { user: null }
  }
}

export async function logout(): Promise<void> {
  await request('/auth/logout', { method: 'POST' })
}

export function getGoogleAuthUrl(): string {
  return `${API_BASE}/auth/google`
}
