import type { PrehladSarzeDto } from '~~/shared/types/api'

interface OdpovedPrehladuPivnice {
  pivnica: { id: string; name: string }
  summary: { aktivneSarze: number; totalVolume: number }
  sarze: PrehladSarzeDto[]
}

export function usePivnica() {
  return useFetch<OdpovedPrehladuPivnice>('/api/pivnica/prehlad', { key: 'prehlad-pivnice' })
}
