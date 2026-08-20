import type { VinoDto } from '~~/shared/types/api'
export function useVina() {
  return useFetch<VinoDto[]>('/api/vina', { key: 'vina' })
}
export function useVino(id: MaybeRefOrGetter<string>) {
  return useFetch<VinoDto>(() => `/api/vina/${toValue(id)}`, { key: () => `vino-${toValue(id)}` })
}