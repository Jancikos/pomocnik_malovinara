export enum FazaSarze {
  MUST = 'MUST',
  ODKALENIE = 'ODKALENIE',
  KVASENIE = 'KVASENIE',
  ZRENIE = 'ZRENIE',
}

export enum StavSarze {
  AKTIVNA = 'AKTIVNA',
  UZAVRETA = 'UZAVRETA',
}

export const nazvyFazSarze: Record<FazaSarze, string> = {
  [FazaSarze.MUST]: 'Mušt',
  [FazaSarze.ODKALENIE]: 'Odkaľovanie',
  [FazaSarze.KVASENIE]: 'Kvasenie',
  [FazaSarze.ZRENIE]: 'Zrenie',
}

export const moznostiFazSarze = Object.values(FazaSarze).map((value) => ({
  value,
  label: nazvyFazSarze[value],
}))

export function povolenaCielovaFaza(source: FazaSarze, zasah: string): FazaSarze | null {
  if (source === FazaSarze.MUST && zasah === 'ODKALENIE') return FazaSarze.ODKALENIE
  if (source === FazaSarze.ODKALENIE && zasah === 'STACANIE') return FazaSarze.KVASENIE
  if (source === FazaSarze.KVASENIE && zasah === 'STACANIE') return FazaSarze.ZRENIE
  return null
}