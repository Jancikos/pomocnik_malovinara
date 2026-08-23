import type { FazaSarze, TypNadoby } from '../domain'

export interface DetailSarzeFormBody {
  nadoba: {
    name: string
    type: TypNadoby
    capacity: number
    location: string
  }
  volume: number
}

export interface SarzaFormBody extends DetailSarzeFormBody {
  vinoId: string
  faza: FazaSarze
  openedAt: string
}