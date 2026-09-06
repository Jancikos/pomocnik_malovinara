export default defineNuxtRouteMiddleware(async (to) => {
  const publicPaths = new Set(['/login', '/register', '/verify-email', '/pozvanka'])
  if (publicPaths.has(to.path)) return
  const auth = useAuth()
  if (!auth.current.value) {
    try { await auth.load() }
    catch { return navigateTo('/login') }
  }
  if (!auth.canEdit.value && /\/(new|edit)$/.test(to.path)) return navigateTo('/pivnica')
})
