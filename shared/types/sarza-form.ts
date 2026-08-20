import type { FazaSarze, TypNadoby } from '../domain'

export interface SarzaFormBody {
  vinoId: string
  faza: FazaSarze
  nadoba: {
    name: string
    type: TypNadoby
    capacity: number
    location: string
  }
  volume: number
  openedAt: string
}