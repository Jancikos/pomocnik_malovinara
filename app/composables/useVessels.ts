import type { VesselDto } from '~~/shared/types/api'
export function useVessels() {
  return useFetch<VesselDto[]>('/api/vessels', { key: 'vessels' })
}