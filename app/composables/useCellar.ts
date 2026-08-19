import type { BatchSummaryDto } from '~~/shared/types/api'

interface DashboardResponse {
  cellar: { id: string; name: string }
  summary: { activeBatches: number; totalVolume: number }
  batches: BatchSummaryDto[]
}

export function useCellar() {
  return useFetch<DashboardResponse>('/api/cellar/dashboard', { key: 'cellar-dashboard' })
}
