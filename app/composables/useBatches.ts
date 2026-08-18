import type { BatchDetailDto, BatchSummaryDto } from '~~/shared/types/api'

export function useBatches(status?: string) {
  return useFetch<BatchSummaryDto[]>('/api/batches', { query: status ? { status } : undefined, key: `batches-${status || 'all'}` })
}

export function useBatch(id: MaybeRefOrGetter<string>) {
  return useFetch<BatchDetailDto>(() => `/api/batches/${toValue(id)}`, { key: () => `batch-${toValue(id)}` })
}