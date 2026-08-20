import type { FazaSarze, StavSarze, TypZasahu, TypMerania, TypNadoby, FarbaVina } from '../domain'

export interface PosledneMeranieDto {
  id: string
  type: TypMerania
  value: number
  unit: string
  zmeraneAt: string
}

export interface SnapshotNadobyDto {
  name: string
  type: TypNadoby
  capacity: number
  location: string | null
}

export interface VinoDto {
  id: string
  name: string
  code: string
  rocnik: number
  color: FarbaVina
  notes: string | null
  vstupneSuroviny?: Array<{
    id: string
    odrodaHrozna: string
    percentage: number
    weightKg: number | null
    volumeLiters: number | null
    cukornatostPriZbere: number | null
  }>
}

export interface PrehladSarzeDto {
  id: string
  vinoId: string
  nazovVina: string
  kodVina: string
  rocnik: number
  faza: FazaSarze
  status: StavSarze
  volume: number
  nadoba: SnapshotNadobyDto
  posledneMerania: Partial<Record<TypMerania, PosledneMeranieDto>>
  rodicovskaSarzaId: string | null
  openedAt: string
  closedAt: string | null
}

export interface MeranieDto extends PosledneMeranieDto {
  sarzaId: string
  createdAt: string
}

export interface ZasahDto {
  id: string
  sarzaId: string
  type: TypZasahu
  vykonaneAt: string
  notes: string | null
  createdAt: string
}

export interface DetailSarzeDto extends PrehladSarzeDto {
  merania: MeranieDto[]
  zasahy: ZasahDto[]
  children: Array<{ id: string; faza: FazaSarze; nazovNadoby: string; volume: number }>
}
