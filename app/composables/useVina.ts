import type { VinoDto } from '~~/shared/types/api'
export function useVina() {
  return useFreshFetch<VinoDto[]>('/api/vina', { key: 'vina' })
}
export function useVino(id: MaybeRefOrGetter<string>) {
  return useFreshFetch<VinoDto>(() => `/api/vina/${toValue(id)}`, { key: () => `vino-${toValue(id)}` })
}
