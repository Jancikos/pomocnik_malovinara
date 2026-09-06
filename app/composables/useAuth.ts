export interface AuthState {
  user: { id: string; nickname: string; email: string }
  pivnica: { id: string; name: string; logo: string | null; role: 'OWNER' | 'MEMBER' | 'VIEWER' }
  pivnice: Array<{ id: string; name: string; logo: string | null; role: 'OWNER' | 'MEMBER' | 'VIEWER' }>
  preferences: { defaultContainerLocation: string }
}

export function useAuth() {
  const current = useState<AuthState | null>('auth', () => null)
  const canEdit = computed(() => current.value?.pivnica.role === 'OWNER' || current.value?.pivnica.role === 'MEMBER')
  const isOwner = computed(() => current.value?.pivnica.role === 'OWNER')
  const load = async () => {
    current.value = await useRequestFetch()<AuthState>('/api/auth/me')
    return current.value
  }
  const login = async (email: string, password: string) => {
    await $fetch('/api/auth/login', { method: 'POST', body: { email, password } })
    await load()
  }
  const updateCurrent = (state: AuthState) => { current.value = state }
  const select = async (id: string) => {
    await $fetch('/api/cellars/select', { method: 'POST', body: { id } })
    await navigateTo('/pivnica', { external: true })
  }
  const logout = async () => {
    await $fetch('/api/auth/logout', { method: 'POST' })
    current.value = null
    clearNuxtData()
    await navigateTo('/login')
  }
  return { current, canEdit, isOwner, load, login, updateCurrent, select, logout }
}
