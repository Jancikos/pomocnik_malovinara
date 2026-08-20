export enum TypNadoby {
  NEREZOVY_TANK = 'NEREZOVY_TANK',
  DREVENY_SUD = 'DREVENY_SUD',
  PLASTOVA_KADA = 'PLASTOVA_KADA',
  PLASTOVY_SUD = 'PLASTOVY_SUD',
  DEMIZON = 'DEMIZON',
}

export const nazvyTypovNadob: Record<TypNadoby, string> = {
  [TypNadoby.NEREZOVY_TANK]: 'Nerezový tank',
  [TypNadoby.DREVENY_SUD]: 'Drevený sud',
  [TypNadoby.PLASTOVA_KADA]: 'Plastová kaďa',
  [TypNadoby.PLASTOVY_SUD]: 'Plastový sud',
  [TypNadoby.DEMIZON]: 'Demižón',
}

export const obrazkyTypovNadob: Record<TypNadoby, string> = {
  [TypNadoby.NEREZOVY_TANK]: 'nerezovy-tank',
  [TypNadoby.DREVENY_SUD]: 'dreveny-sud',
  [TypNadoby.PLASTOVA_KADA]: 'plastova-kada',
  [TypNadoby.PLASTOVY_SUD]: 'plastovy-sud',
  [TypNadoby.DEMIZON]: 'demizon',
}

export const moznostiTypovNadob = Object.values(TypNadoby).map((value) => ({
  value,
  label: nazvyTypovNadob[value],
}))