export enum TypZasahu {
  STACANIE = 'STACANIE',
  ODKALENIE = 'ODKALENIE',
  KVASENIE = 'KVASENIE',
  SIRENIE = 'SIRENIE',
  DOSLADZANIE = 'DOSLADZANIE',
  PRIDANIE_VODY = 'PRIDANIE_VODY',
}

export const nazvyZasahov: Record<TypZasahu, string> = {
  [TypZasahu.STACANIE]: 'Stáčanie',
  [TypZasahu.ODKALENIE]: 'Odkalenie',
  [TypZasahu.KVASENIE]: 'Kvasenie',
  [TypZasahu.SIRENIE]: 'Sírenie',
  [TypZasahu.DOSLADZANIE]: 'Dosládzanie',
  [TypZasahu.PRIDANIE_VODY]: 'Pridanie vody',
}

export const moznostiZasahov = Object.values(TypZasahu).map((value) => ({
  value,
  label: nazvyZasahov[value],
}))