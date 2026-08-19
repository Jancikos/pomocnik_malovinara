import { BatchStatus } from '../../shared/domain'
import type { Database } from '../database/client'
import { getBatches } from './batch.service'

export async function getDashboard(db: Database, cellar: { id: string; name: string }) {
  const batches = await getBatches(db, cellar.id, BatchStatus.ACTIVE)
  return {
    cellar,
    summary: {
      activeBatches: batches.length,
      totalVolume: batches.reduce((sum, batch) => sum + batch.volume, 0),
    },
    batches,
  }
}
