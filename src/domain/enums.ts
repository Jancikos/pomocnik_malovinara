export enum WineColor {
  White = 'white',
  Rose = 'rose',
  Red = 'red',
  Other = 'other',
}

export enum BatchLifecycleStatus {
  Active = 'active',
  Closed = 'closed',
}

export enum SyncState {
  Pending = 'pending',
  Syncing = 'syncing',
  Synced = 'synced',
  Failed = 'failed',
}

export const enumLabels = {
  wineColor: {
    [WineColor.White]: 'Biele',
    [WineColor.Rose]: 'Ružové',
    [WineColor.Red]: 'Červené',
    [WineColor.Other]: 'Iné',
  },
  batchLifecycle: {
    [BatchLifecycleStatus.Active]: 'Aktívna',
    [BatchLifecycleStatus.Closed]: 'Uzavretá',
  },
  syncState: {
    [SyncState.Pending]: 'Čaká na odoslanie',
    [SyncState.Syncing]: 'Synchronizuje sa',
    [SyncState.Synced]: 'Odoslané',
    [SyncState.Failed]: 'Chyba',
  },
} as const
