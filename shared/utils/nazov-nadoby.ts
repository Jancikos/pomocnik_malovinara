import { TypNadoby } from '../domain'

const skratkyTypovNadob: Record<TypNadoby, string> = {
  [TypNadoby.NEREZOVY_TANK]: 'Tank',
  [TypNadoby.DREVENY_SUD]: 'Sud',
  [TypNadoby.PLASTOVA_KADA]: 'Kaďa',
  [TypNadoby.PLASTOVY_SUD]: 'Sud',
  [TypNadoby.DEMIZON]: 'Demižón',
}

export function navrhniNazovNadoby(type: TypNadoby, capacity: number): string {
  const skratka = skratkyTypovNadob[type] ?? 'Nádoba'
  const objem = Number.isInteger(capacity)
    ? String(capacity)
    : capacity.toLocaleString('sk-SK', { maximumFractionDigits: 1 })

  return `${skratka} ${objem}L`
}