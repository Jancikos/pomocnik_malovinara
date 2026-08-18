export default defineNuxtRouteMiddleware(async (to) => {
  if (to.path === '/login') return
  const auth = useAuth()
  if (auth.current.value) return
  try {
    await auth.load()
  } catch {
    return navigateTo('/login')
  }
})