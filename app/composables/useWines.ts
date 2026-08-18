import type { WineDto } from '~~/shared/types/api'
export function useWines() {
  return useFetch<WineDto[]>('/api/wines', { key: 'wines' })
}
export function useWine(id: MaybeRefOrGetter<string>) {
  return useFetch<WineDto>(() => `/api/wines/${toValue(id)}`, { key: () => `wine-${toValue(id)}` })
}