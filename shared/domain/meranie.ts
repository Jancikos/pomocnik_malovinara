export enum TypMerania {
  CUKORNATOST = 'CUKORNATOST',
  PH = 'PH',
  HUSTOTA = 'HUSTOTA',
  TEPLOTA = 'TEPLOTA',
}

export const nazvyMerani: Record<TypMerania, string> = {
  [TypMerania.CUKORNATOST]: 'Cukornatosť',
  [TypMerania.PH]: 'pH',
  [TypMerania.HUSTOTA]: 'Hustota',
  [TypMerania.TEPLOTA]: 'Teplota',
}

export const jednotkyMerani: Record<TypMerania, string> = {
  [TypMerania.CUKORNATOST]: '°NM',
  [TypMerania.PH]: 'pH',
  [TypMerania.HUSTOTA]: 'kg/m³',
  [TypMerania.TEPLOTA]: '°C',
}

export const moznostiMerani = Object.values(TypMerania).map((value) => ({
  value,
  label: nazvyMerani[value],
  unit: jednotkyMerani[value],
}))