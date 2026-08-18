export enum BatchPhase {
  MUST = 'MUST',
  CLARIFICATION = 'CLARIFICATION',
  FERMENTATION = 'FERMENTATION',
  AGING = 'AGING',
}

export enum BatchStatus {
  ACTIVE = 'ACTIVE',
  CLOSED = 'CLOSED',
}

export const batchPhaseLabels: Record<BatchPhase, string> = {
  [BatchPhase.MUST]: 'Mušt',
  [BatchPhase.CLARIFICATION]: 'Odkaľovanie',
  [BatchPhase.FERMENTATION]: 'Kvasenie',
  [BatchPhase.AGING]: 'Zrenie',
}

export const batchPhaseOptions = Object.values(BatchPhase).map((value) => ({
  value,
  label: batchPhaseLabels[value],
}))

export function allowedTargetPhase(source: BatchPhase, intervention: string): BatchPhase | null {
  if (source === BatchPhase.MUST && intervention === 'CLARIFICATION') return BatchPhase.CLARIFICATION
  if (source === BatchPhase.CLARIFICATION && intervention === 'RACKING') return BatchPhase.FERMENTATION
  if (source === BatchPhase.FERMENTATION && intervention === 'RACKING') return BatchPhase.AGING
  return null
}