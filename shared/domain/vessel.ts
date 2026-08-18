export enum VesselType {
  STEEL_TANK = 'STEEL_TANK',
  OAK_BARREL = 'OAK_BARREL',
  PLASTIC_VAT = 'PLASTIC_VAT',
  PLASTIC_BARREL = 'PLASTIC_BARREL',
  DEMIJOHN = 'DEMIJOHN',
}

export const vesselTypeLabels: Record<VesselType, string> = {
  [VesselType.STEEL_TANK]: 'Nerezový tank',
  [VesselType.OAK_BARREL]: 'Drevený sud',
  [VesselType.PLASTIC_VAT]: 'Plastová kaďa',
  [VesselType.PLASTIC_BARREL]: 'Plastový sud',
  [VesselType.DEMIJOHN]: 'Demižón',
}

export const vesselTypeImages: Record<VesselType, string> = {
  [VesselType.STEEL_TANK]: 'steel-tank',
  [VesselType.OAK_BARREL]: 'oak-barrel',
  [VesselType.PLASTIC_VAT]: 'plastic-vat',
  [VesselType.PLASTIC_BARREL]: 'plastic-barrel',
  [VesselType.DEMIJOHN]: 'demijohn',
}

export const vesselTypeOptions = Object.values(VesselType).map((value) => ({
  value,
  label: vesselTypeLabels[value],
}))