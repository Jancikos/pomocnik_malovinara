export default defineNuxtRouteMiddleware(async (to) => {
  const publicPaths = new Set(['/login', '/register', '/verify-email'])
  if (publicPaths.has(to.path)) return
  const auth = useAuth()
  if (auth.current.value) return
  try {
    await auth.load()
  } catch {
    return navigateTo('/login')
  }
})