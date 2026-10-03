import type { UseFetchOptions } from '#app'

/** Wait for current database data even when another page still shares this key. */
export function useFreshFetch<T>(request: MaybeRefOrGetter<string>, options: Pick<UseFetchOptions<T>, 'key' | 'query'>) {
  const nuxtApp = useNuxtApp()
  const result = useFetch<T>(request, { ...options, cache: 'no-store' })

  // Nuxt skips the initial fetch for a shared entry whose status is already success.
  // Keep the server response during hydration; refresh reused entries on navigation.
  if (!nuxtApp.isHydrating && result.status.value === 'success') {
    return result.refresh().then(() => result)
  }
  return result
}
