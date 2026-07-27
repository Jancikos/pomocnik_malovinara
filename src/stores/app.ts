import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import type {
  AuditEntry,
  Batch,
  BatchContainer,
  HistoryEvent,
  Intervention,
  Measurement,
  SyncQueueItem,
  Wine,
} from '@/domain/models'
import { wineryRepository } from '@/repositories/wineryRepository'
import { isContainerLabelUnique, parseSlovakNumber, validateCapacity } from '@/domain/rules'
import { catalogService } from '@/services/catalog'

const sessionKey = 'vinarsky-pomocnik-session'

function uuid(): string {
  return crypto.randomUUID()
}

export const useAppStore = defineStore('app', () => {
  const ready = ref(false)
  const authenticated = ref(localStorage.getItem(sessionKey) === 'user-oskar')
  const wines = ref<Wine[]>([])
  const batches = ref<Batch[]>([])
  const measurements = ref<Measurement[]>([])
  const interventions = ref<Intervention[]>([])
  const audits = ref<AuditEntry[]>([])
  const queue = ref<SyncQueueItem[]>([])
  const online = ref(navigator.onLine)
  const syncing = ref(false)
  const error = ref('')
  const lastSyncAt = ref(localStorage.getItem('vinarsky-last-sync') ?? '')

  const activeBatches = computed(() => batches.value.filter((batch) => batch.status === 'active'))
  const pendingCount = computed(
    () =>
      queue.value.filter((item) => item.status === 'pending' || item.status === 'failed').length,
  )
  const history = computed<HistoryEvent[]>(() =>
    [
      ...measurements.value
        .filter((item) => !item.deletedAt)
        .map((item) => ({ ...item, eventKind: 'measurement' as const })),
      ...interventions.value
        .filter((item) => !item.deletedAt)
        .map((item) => ({ ...item, eventKind: 'intervention' as const })),
    ].sort((a, b) => eventDate(b).localeCompare(eventDate(a))),
  )

  async function initialize() {
    if (ready.value) return
    await wineryRepository.initialize()
    await refresh()
    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', () => (online.value = false))
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible' && online.value) void synchronize()
    })
    ready.value = true
    if (authenticated.value && online.value && pendingCount.value) void synchronize()
  }

  async function refresh() {
    const data = await wineryRepository.snapshot()
    wines.value = data.wines
    batches.value = data.batches
    measurements.value = data.measurements
    interventions.value = data.interventions
    audits.value = data.audits
    queue.value = data.queue
  }

  async function handleOnline() {
    online.value = true
    await synchronize()
  }

  function login(email: string, password: string): boolean {
    error.value = ''
    if (!online.value && !localStorage.getItem(sessionKey)) {
      error.value = 'Prvé prihlásenie vyžaduje internetové pripojenie.'
      return false
    }
    if (email.trim().toLowerCase() !== 'oskar@example.sk' || password !== 'vino2026') {
      error.value = 'E-mail alebo heslo nie sú správne.'
      return false
    }
    localStorage.setItem(sessionKey, 'user-oskar')
    authenticated.value = true
    return true
  }

  function logout(): boolean {
    if (pendingCount.value > 0) {
      const proceed = window.confirm(
        'Niektoré údaje ešte čakajú na odoslanie. Zostanú uložené v tomto zariadení. Odhlásiť sa?',
      )
      if (!proceed) return false
    }
    localStorage.removeItem(sessionKey)
    authenticated.value = false
    return true
  }

  function wineFor(batch: Batch): Wine | undefined {
    return wines.value.find((wine) => wine.id === batch.wineId)
  }

  function batchById(id: string): Batch | undefined {
    return batches.value.find((batch) => batch.id === id)
  }

  async function addWineAndBatch(input: {
    wineName: string
    vintageYear: number
    color: Wine['color']
    batchName: string
    container: BatchContainer
    volume: number
    phase: string
    notes?: string
  }) {
    const issue = validateCapacity(input.volume, input.container.capacityLiters)
    if (issue) throw new Error(issue)
    if (!isContainerLabelUnique(input.container.label, batches.value)) {
      throw new Error('Toto označenie už používa iná aktívna šarža.')
    }
    if (!online.value) throw new Error('Vytvorenie vína a šarže vyžaduje internet.')
    const now = new Date().toISOString()
    const wineId = uuid()
    const wine: Wine = {
      id: wineId,
      code: `V-${Date.now().toString().slice(-5)}`,
      name: input.wineName.trim(),
      vintageYear: input.vintageYear,
      color: input.color,
      notes: input.notes,
      createdAt: now,
    }
    const batch: Batch = {
      id: uuid(),
      wineId,
      code: `S-${Date.now().toString().slice(-5)}`,
      name: input.batchName.trim(),
      status: 'active',
      phase: input.phase,
      container: input.container,
      currentVolumeLiters: input.volume,
      startedAt: now,
      notes: input.notes,
      createdAt: now,
      updatedAt: now,
    }
    await wineryRepository.addWineAndBatch(wine, batch)
    await refresh()
    if (online.value) await synchronize()
  }

  async function addMeasurement(input: {
    batchId: string
    type: string
    value?: string
    sensoryRating?: string
    appearance?: string
    aroma?: string
    taste?: string
    notes?: string
    measuredAt: string
    unit?: string
  }) {
    const batch = batchById(input.batchId)
    if (!batch) throw new Error('Šarža sa nenašla.')
    const numericValue = input.value === undefined ? undefined : parseSlovakNumber(input.value)
    if (input.value !== undefined && numericValue === undefined) {
      throw new Error('Zadajte platnú číselnú hodnotu.')
    }
    const now = new Date().toISOString()
    const measurement: Measurement = {
      id: uuid(),
      wineId: batch.wineId,
      batchId: batch.id,
      type: input.type,
      numericValue,
      sensoryRating: input.sensoryRating,
      appearance: input.appearance,
      aroma: input.aroma,
      taste: input.taste,
      notes: input.notes,
      measuredAt: new Date(input.measuredAt).toISOString(),
      unit: input.unit,
      createdAt: now,
      updatedAt: now,
      syncStatus: online.value ? 'synced' : 'pending',
    }
    await wineryRepository.addMeasurement(measurement)
    await refresh()
    if (online.value) await synchronize()
  }

  async function addIntervention(input: {
    batchId: string
    type: string
    performedAt: string
    substance?: string
    amount?: string
    amountUnit?: string
    notes?: string
  }) {
    const batch = batchById(input.batchId)
    if (!batch) throw new Error('Šarža sa nenašla.')
    const amount = input.amount ? parseSlovakNumber(input.amount) : undefined
    if (input.amount && amount === undefined) throw new Error('Množstvo nie je platné číslo.')
    const now = new Date().toISOString()
    const intervention: Intervention = {
      id: uuid(),
      wineId: batch.wineId,
      batchId: batch.id,
      type: input.type,
      performedAt: new Date(input.performedAt).toISOString(),
      substance: input.substance,
      amount,
      amountUnit: input.amountUnit,
      notes: input.notes,
      createdAt: now,
      updatedAt: now,
      syncStatus: online.value ? 'synced' : 'pending',
    }
    await wineryRepository.addIntervention(intervention)
    await refresh()
    if (online.value) await synchronize()
  }

  async function transferBatch(input: {
    sourceBatchId: string
    type: 'transfer' | 'bottling'
    targetLabel: string
    targetType: string
    capacity: number
    volume: number
    loss: number
    notes?: string
    performedAt: string
  }) {
    const source = batchById(input.sourceBatchId)
    if (!source || source.status !== 'active') throw new Error('Zdrojová šarža nie je aktívna.')
    const issue = validateCapacity(input.volume, input.capacity)
    if (issue) throw new Error(issue)
    if (Math.abs(input.volume + input.loss - source.currentVolumeLiters) > 0.001) {
      throw new Error('Súčet cieľového objemu a straty musí zodpovedať zdrojovému objemu.')
    }
    if (!isContainerLabelUnique(input.targetLabel, batches.value, source.id)) {
      throw new Error('Toto označenie už používa iná aktívna šarža.')
    }
    const now = new Date().toISOString()
    const targetId = uuid()
    const target: Batch = {
      ...source,
      id: targetId,
      code: `${source.code}-${input.type === 'bottling' ? 'F' : 'P'}`,
      name: `${source.name} – ${input.type === 'bottling' ? 'fľaše' : 'presun'}`,
      phase: input.type === 'bottling' ? 'bottled' : source.phase,
      container: {
        label: input.targetLabel.trim(),
        type: input.targetType,
        capacityLiters: input.capacity,
        imageKey: input.targetType,
      },
      currentVolumeLiters: input.volume,
      startedAt: new Date(input.performedAt).toISOString(),
      createdAt: now,
      updatedAt: now,
      closedAt: undefined,
      closeReason: undefined,
      status: 'active',
    }
    const intervention: Intervention = {
      id: uuid(),
      wineId: source.wineId,
      batchId: source.id,
      type: input.type,
      performedAt: new Date(input.performedAt).toISOString(),
      volumeBeforeLiters: source.currentVolumeLiters,
      volumeAfterLiters: input.volume,
      sourceBatchIds: [source.id],
      targetBatchIds: [targetId],
      lossLiters: input.loss,
      notes: input.notes,
      operationGroupId: uuid(),
      createdAt: now,
      updatedAt: now,
      syncStatus: online.value ? 'synced' : 'pending',
    }
    await wineryRepository.transferBatch(source, target, intervention)
    await refresh()
    if (online.value) await synchronize()
  }

  async function splitBatch(input: {
    sourceBatchId: string
    targets: Array<{ label: string; type: string; capacity: number; volume: number }>
    loss: number
    notes?: string
    performedAt: string
  }) {
    const source = batchById(input.sourceBatchId)
    if (!source || source.status !== 'active') throw new Error('Zdrojová šarža nie je aktívna.')
    if (input.targets.length < 2) throw new Error('Rozdelenie potrebuje aspoň dve cieľové nádoby.')
    if (
      Math.abs(
        input.targets.reduce((sum, target) => sum + target.volume, 0) +
          input.loss -
          source.currentVolumeLiters,
      ) > 0.001
    ) {
      throw new Error('Súčet cieľových objemov a straty musí zodpovedať zdrojovému objemu.')
    }
    const labels = input.targets.map((target) => target.label.trim())
    if (new Set(labels.map((label) => label.toLocaleLowerCase('sk'))).size !== labels.length) {
      throw new Error('Cieľové nádoby musia mať rozdielne označenia.')
    }
    input.targets.forEach((target) => {
      const issue = validateCapacity(target.volume, target.capacity)
      if (issue) throw new Error(issue)
      if (!isContainerLabelUnique(target.label, batches.value, source.id)) {
        throw new Error(`Označenie ${target.label} už používa iná aktívna šarža.`)
      }
    })
    const now = new Date().toISOString()
    const targets = input.targets.map<Batch>((target, index) => ({
      ...source,
      id: uuid(),
      code: `${source.code}-R${index + 1}`,
      name: `${source.name} – časť ${index + 1}`,
      container: {
        label: target.label.trim(),
        type: target.type,
        capacityLiters: target.capacity,
        imageKey: catalogService.get('container-types', target.type)?.imageKey ?? target.type,
      },
      currentVolumeLiters: target.volume,
      startedAt: new Date(input.performedAt).toISOString(),
      createdAt: now,
      updatedAt: now,
      closedAt: undefined,
      closeReason: undefined,
      status: 'active',
    }))
    const intervention: Intervention = {
      id: uuid(),
      wineId: source.wineId,
      batchId: source.id,
      type: 'split',
      performedAt: new Date(input.performedAt).toISOString(),
      volumeBeforeLiters: source.currentVolumeLiters,
      volumeAfterLiters: targets.reduce((sum, target) => sum + target.currentVolumeLiters, 0),
      sourceBatchIds: [source.id],
      targetBatchIds: targets.map((target) => target.id),
      lossLiters: input.loss,
      notes: input.notes,
      operationGroupId: uuid(),
      createdAt: now,
      updatedAt: now,
      syncStatus: online.value ? 'synced' : 'pending',
    }
    await wineryRepository.splitBatch(source, targets, intervention)
    await refresh()
    if (online.value) await synchronize()
  }

  async function mergeBatches(input: {
    sourceBatchIds: string[]
    targetLabel: string
    targetType: string
    capacity: number
    volume: number
    loss: number
    notes?: string
    performedAt: string
  }) {
    const sources = input.sourceBatchIds
      .map((id) => batchById(id))
      .filter((item): item is Batch => Boolean(item))
    if (sources.length < 2 || sources.some((source) => source.status !== 'active')) {
      throw new Error('Spojenie potrebuje aspoň dve aktívne šarže.')
    }
    if (new Set(sources.map((source) => source.wineId)).size !== 1) {
      throw new Error('V prvej verzii možno spájať iba šarže rovnakého vína.')
    }
    const sourceVolume = sources.reduce((sum, source) => sum + source.currentVolumeLiters, 0)
    if (Math.abs(input.volume + input.loss - sourceVolume) > 0.001) {
      throw new Error('Súčet cieľového objemu a straty musí zodpovedať zdrojovým objemom.')
    }
    const issue = validateCapacity(input.volume, input.capacity)
    if (issue) throw new Error(issue)
    if (!isContainerLabelUnique(input.targetLabel, batches.value)) {
      throw new Error('Toto označenie už používa iná aktívna šarža.')
    }
    const now = new Date().toISOString()
    const target: Batch = {
      ...sources[0]!,
      id: uuid(),
      code: `${sources[0]!.code}-S`,
      name: `${sources[0]!.name} – spojená`,
      container: {
        label: input.targetLabel.trim(),
        type: input.targetType,
        capacityLiters: input.capacity,
        imageKey:
          catalogService.get('container-types', input.targetType)?.imageKey ?? input.targetType,
      },
      currentVolumeLiters: input.volume,
      startedAt: new Date(input.performedAt).toISOString(),
      createdAt: now,
      updatedAt: now,
      closedAt: undefined,
      closeReason: undefined,
      status: 'active',
    }
    const intervention: Intervention = {
      id: uuid(),
      wineId: sources[0]!.wineId,
      batchId: sources[0]!.id,
      type: 'merge',
      performedAt: new Date(input.performedAt).toISOString(),
      volumeBeforeLiters: sourceVolume,
      volumeAfterLiters: input.volume,
      sourceBatchIds: sources.map((source) => source.id),
      targetBatchIds: [target.id],
      lossLiters: input.loss,
      notes: input.notes,
      operationGroupId: uuid(),
      createdAt: now,
      updatedAt: now,
      syncStatus: online.value ? 'synced' : 'pending',
    }
    await wineryRepository.mergeBatches(sources, target, intervention)
    await refresh()
    if (online.value) await synchronize()
  }

  async function editPending(kind: 'measurement' | 'intervention', id: string, notes: string) {
    await wineryRepository.updatePendingEvent(kind, id, { notes })
    await refresh()
  }

  async function removePending(kind: 'measurement' | 'intervention', id: string) {
    await wineryRepository.deletePendingEvent(kind, id)
    await refresh()
  }

  async function synchronize() {
    if (!online.value || syncing.value) return
    syncing.value = true
    error.value = ''
    try {
      const fail = localStorage.getItem('vinarsky-simulate-error') === 'true'
      await wineryRepository.sync(fail)
      await refresh()
      if (!fail) {
        lastSyncAt.value = new Date().toISOString()
        localStorage.setItem('vinarsky-last-sync', lastSyncAt.value)
      }
    } catch {
      online.value = false
      error.value = 'Spojenie sa nepodarilo. Údaje zostali bezpečne uložené.'
    } finally {
      syncing.value = false
    }
  }

  async function resetDemo() {
    await wineryRepository.reset()
    await refresh()
  }

  return {
    ready,
    authenticated,
    wines,
    batches,
    measurements,
    interventions,
    audits,
    queue,
    online,
    syncing,
    error,
    lastSyncAt,
    activeBatches,
    pendingCount,
    history,
    initialize,
    login,
    logout,
    wineFor,
    batchById,
    addWineAndBatch,
    addMeasurement,
    addIntervention,
    transferBatch,
    splitBatch,
    mergeBatches,
    editPending,
    removePending,
    synchronize,
    resetDemo,
  }
})

function eventDate(event: HistoryEvent): string {
  return event.eventKind === 'measurement' ? event.measuredAt : event.performedAt
}
