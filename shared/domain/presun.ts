import type { FazaSarze } from './sarza'
import type { TypNadoby } from './nadoba'

export interface CielPresunuInput {
  nadoba: {
    name: string
    type: TypNadoby
    capacity: number
    location?: string
  }
  volume: number
}

export interface PresunInput {
  zdrojovaSarzaId: string
  ciele: CielPresunuInput[]
  lossVolume: number
  cielovaFaza: FazaSarze
  vykonaneAt?: string
  notes?: string
}

export function overBilanciuObjemu(
  sourceVolume: number,
  ciele: Array<{ volume: number }>,
  lossVolume: number,
): void {
  if (lossVolume < 0) throw new Error('Strata nemôže byť záporná.')
  if (ciele.length === 0) throw new Error('Vyplňte aspoň jednu cieľovú nádobu.')
  if (ciele.some((ciel) => ciel.volume <= 0)) {
    throw new Error('Cieľové objemy musia byť kladné.')
  }
  const used = ciele.reduce((sum, ciel) => sum + ciel.volume, 0)
  if (Math.abs(used + lossVolume - sourceVolume) > 0.001) {
    throw new Error('Súčet cieľových objemov a straty musí zodpovedať zdrojovému objemu.')
  }
}
