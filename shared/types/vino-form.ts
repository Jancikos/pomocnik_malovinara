import type { FarbaVina } from '../domain'

export interface VinoFormMaterial {
  odrodaHrozna: string
  percentage: number
  weightKg?: number
  volumeLiters?: number
  cukornatostPriZbere?: number
}

export interface VinoFormBody {
  name: string
  code: string
  rocnik: number
  color: FarbaVina
  notes: string
  vstupneSuroviny: VinoFormMaterial[]
}