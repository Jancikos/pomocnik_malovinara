export enum MeasurementType {
  SUGAR = 'SUGAR',
  PH = 'PH',
  DENSITY = 'DENSITY',
  TEMPERATURE = 'TEMPERATURE',
}

export const measurementLabels: Record<MeasurementType, string> = {
  [MeasurementType.SUGAR]: 'Cukornatosť',
  [MeasurementType.PH]: 'pH',
  [MeasurementType.DENSITY]: 'Hustota',
  [MeasurementType.TEMPERATURE]: 'Teplota',
}

export const measurementUnits: Record<MeasurementType, string> = {
  [MeasurementType.SUGAR]: '°NM',
  [MeasurementType.PH]: 'pH',
  [MeasurementType.DENSITY]: 'kg/m³',
  [MeasurementType.TEMPERATURE]: '°C',
}

export const measurementOptions = Object.values(MeasurementType).map((value) => ({
  value,
  label: measurementLabels[value],
  unit: measurementUnits[value],
}))