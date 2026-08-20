export enum TypZasahu {
  STACANIE = 'STACANIE',
  ODKALENIE = 'ODKALENIE',
  KVASENIE = 'KVASENIE',
}

export const nazvyZasahov: Record<TypZasahu, string> = {
  [TypZasahu.STACANIE]: 'Stáčanie',
  [TypZasahu.ODKALENIE]: 'Odkalenie',
  [TypZasahu.KVASENIE]: 'Kvasenie',
}

export const moznostiZasahov = Object.values(TypZasahu).map((value) => ({
  value,
  label: nazvyZasahov[value],
}))