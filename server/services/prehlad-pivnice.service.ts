import { StavSarze } from '../../shared/domain'
import type { Database } from '../database/client'
import { nacitajSarze } from './sarza.service'

export async function nacitajPrehladPivnice(db: Database, pivnica: { id: string; name: string }) {
  const sarze = await nacitajSarze(db, pivnica.id, StavSarze.AKTIVNA)
  return {
    pivnica,
    summary: {
      aktivneSarze: sarze.length,
      totalVolume: sarze.reduce((sum, sarza) => sum + sarza.volume, 0),
    },
    sarze,
  }
}
