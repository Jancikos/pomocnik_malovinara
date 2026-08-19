interface AuthState {
  user: { id: string; name: string; email: string }
  cellar: { id: string; name: string }
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
  const logout = async () => {
    await $fetch('/api/auth/logout', { method: 'POST' })
    current.value = null
    await navigateTo('/login')
  }
  return { current, load, login, logout }
}
