/** Stage identity shared by the controls, the tower drawing and the value table. */

export type StageId = 'plume' | 'drift' | 'droplets' | 'fan' | 'recovery'
export type StagePath = 'air' | 'liquid'

export interface StageMeta {
  index: string
  name: string
  path: StagePath
  accent: string
}

export const STAGE_META: Record<StageId, StageMeta> = {
  plume: { index: '1', name: 'Plume & airflow', path: 'air', accent: '#ff9f45' },
  drift: { index: '1', name: 'Drift droplets', path: 'liquid', accent: '#d9a441' },
  droplets: { index: '2', name: 'Drift eliminator', path: 'liquid', accent: '#c9b568' },
  fan: { index: '3', name: 'Fan', path: 'air', accent: '#9c83ff' },
  recovery: { index: '4', name: 'Condensation recovery', path: 'air', accent: '#5ec8ff' },
}

export interface StageGroup {
  key: string
  index: string
  name: string
  path: StagePath
  stages: StageId[]
}

/** Top-level stages; the inlet has two sub-stages. */
export const STAGE_GROUPS: StageGroup[] = [
  { key: 'inlet', index: '1', name: 'Inlet', path: 'air', stages: ['plume', 'drift'] },
  { key: 'droplets', index: '2', name: 'Drift eliminator', path: 'liquid', stages: ['droplets'] },
  { key: 'fan', index: '3', name: 'Fan', path: 'air', stages: ['fan'] },
  { key: 'recovery', index: '4', name: 'Condensation recovery', path: 'air', stages: ['recovery'] },
]

export function groupOf(id: StageId): StageGroup {
  return STAGE_GROUPS.find((g) => g.stages.includes(id)) ?? STAGE_GROUPS[0]
}
