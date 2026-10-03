import type { DetailSarzeDto, PrehladSarzeDto } from '~~/shared/types/api'

export function useSarze(status?: string) {
  return useFreshFetch<PrehladSarzeDto[]>('/api/sarze', { query: status ? { status } : undefined, key: `sarze-${status || 'all'}` })
}

export function useSarza(id: MaybeRefOrGetter<string>) {
  return useFreshFetch<DetailSarzeDto>(() => `/api/sarze/${toValue(id)}`, { key: () => `sarza-${toValue(id)}` })
}
