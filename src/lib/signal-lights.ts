export type LightPayload = {
  no: number
  status_code: string
  status_name: string
  green_count: number
}

export type DevicePayload = {
  device_addr: string
  device_name: string
  response_topic: string
  collected_at: string
  lights: LightPayload[]
}

export type SnapshotMessage = {
  type: 'snapshot'
  devices: DevicePayload[]
}

export type UpdateMessage = {
  type: 'update'
  device: DevicePayload
}

export type SignalLightsMessage = SnapshotMessage | UpdateMessage

export const lightsWsUrl = import.meta.env.VITE_LIGHTS_WS_URL as string | undefined

export function normalizeLightStatus(statusName: string | undefined) {
  switch (statusName?.toLowerCase()) {
    case 'off':
      return { label: '关闭', tone: 'off' as const }
    case 'red':
      return { label: '红灯', tone: 'red' as const }
    case 'yellow':
      return { label: '黄灯', tone: 'yellow' as const }
    case 'green':
      return { label: '绿灯', tone: 'green' as const }
    default:
      return { label: statusName || '未知', tone: 'unknown' as const }
  }
}

export function formatCollectedAt(value: string | undefined) {
  if (!value) {
    return '--'
  }

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return '--'
  }

  return new Intl.DateTimeFormat('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).format(date)
}
