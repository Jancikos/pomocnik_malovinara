export interface AuthState {
  user: { id: string; nickname: string; email: string }
  pivnica: { id: string; name: string }
  preferences: { defaultContainerLocation: string }
}

export function useAuth() {
  const current = useState<AuthState | null>('auth', () => null)

  const load = async () => {
    current.value = await useRequestFetch()<AuthState>('/api/auth/me')
    return current.value
  }

  const login = async (email: string, password: string) => {
    await $fetch('/api/auth/login', { method: 'POST', body: { email, password } })
    await load()
  }

  const updateCurrent = (state: AuthState) => {
    current.value = state
  }

  const logout = async () => {
    await $fetch('/api/auth/logout', { method: 'POST' })
    current.value = null
    await navigateTo('/login')
  }

  return { current, load, login, updateCurrent, logout }
}
