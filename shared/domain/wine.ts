export enum WineColor {
  WHITE = 'WHITE',
  ROSE = 'ROSE',
  RED = 'RED',
  OTHER = 'OTHER',
}

export const wineColorLabels: Record<WineColor, string> = {
  [WineColor.WHITE]: 'Biele',
  [WineColor.ROSE]: 'Ružové',
  [WineColor.RED]: 'Červené',
  [WineColor.OTHER]: 'Iné',
}