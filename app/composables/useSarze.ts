import type { DetailSarzeDto, PrehladSarzeDto } from '~~/shared/types/api'

export function useSarze(status?: string) {
  return useFetch<PrehladSarzeDto[]>('/api/sarze', { query: status ? { status } : undefined, key: `sarze-${status || 'all'}` })
}

export function useSarza(id: MaybeRefOrGetter<string>) {
  return useFetch<DetailSarzeDto>(() => `/api/sarze/${toValue(id)}`, { key: () => `sarza-${toValue(id)}` })
}