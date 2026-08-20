import type { TypMerania } from '../../shared/domain'
import type { DetailSarzeDto, PrehladSarzeDto, PosledneMeranieDto, MeranieDto } from '../../shared/types/api'

export function meranieDto(row: { id: string; sarzaId: string; type: TypMerania; value: number; unit: string; zmeraneAt: Date; createdAt: Date }): MeranieDto {
  return { id: row.id, sarzaId: row.sarzaId, type: row.type, value: row.value, unit: row.unit, zmeraneAt: row.zmeraneAt.toISOString(), createdAt: row.createdAt.toISOString() }
}

export function posledneMeranieDto(rows: Partial<Record<TypMerania, { id: string; type: TypMerania; value: number; unit: string; zmeraneAt: Date }>>): Partial<Record<TypMerania, PosledneMeranieDto>> {
  return Object.fromEntries(Object.entries(rows).map(([type, row]) => [type, row && { id: row.id, type: row.type, value: row.value, unit: row.unit, zmeraneAt: row.zmeraneAt.toISOString() }]))
}

export function prehladSarzeDto(row: any, latest: Partial<Record<TypMerania, any>> = {}): PrehladSarzeDto {
  return {
    id: row.sarza.id,
    vinoId: row.vino.id,
    nazovVina: row.vino.name,
    kodVina: row.vino.code,
    rocnik: row.vino.rocnik,
    faza: row.sarza.faza,
    status: row.sarza.status,
    volume: row.sarza.volume,
    nadoba: {
      name: row.sarza.nazovNadoby,
      type: row.sarza.typNadoby,
      capacity: row.sarza.kapacitaNadoby,
      location: row.sarza.umiestnenieNadoby,
    },
    posledneMerania: posledneMeranieDto(latest),
    rodicovskaSarzaId: row.sarza.rodicovskaSarzaId,
    openedAt: row.sarza.openedAt.toISOString(),
    closedAt: row.sarza.closedAt?.toISOString() ?? null,
  }
}

export function detailSarzeDto(summary: PrehladSarzeDto, merania: MeranieDto[], zasahy: any[], children: any[]): DetailSarzeDto {
  return {
    ...summary,
    merania,
    zasahy: zasahy.map((item) => ({ id: item.id, sarzaId: item.sarzaId, type: item.type, vykonaneAt: item.vykonaneAt.toISOString(), notes: item.notes, createdAt: item.createdAt.toISOString() })),
    children,
  }
}
