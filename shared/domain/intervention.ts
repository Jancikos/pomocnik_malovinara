export enum InterventionType {
  RACKING = 'RACKING',
  CLARIFICATION = 'CLARIFICATION',
  FERMENTATION = 'FERMENTATION',
}

export const interventionLabels: Record<InterventionType, string> = {
  [InterventionType.RACKING]: 'Stáčanie',
  [InterventionType.CLARIFICATION]: 'Odkalenie',
  [InterventionType.FERMENTATION]: 'Kvasenie',
}

export const interventionOptions = Object.values(InterventionType).map((value) => ({
  value,
  label: interventionLabels[value],
}))