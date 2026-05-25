const machinesApiUrl = (import.meta.env.VITE_MACHINES_API_URL as string | undefined) || '/api/machines'

export type MachineRecord = {
  code: string
  workshop: string
  name?: string
  deviceAddr?: string
  deviceName?: string
}

export async function fetchMachines(signal?: AbortSignal) {
  const response = await fetch(machinesApiUrl, { signal })
  const contentType = response.headers.get('content-type') || ''
  const bodyText = await response.text()

  if (!response.ok) {
    throw new Error(`获取机器列表失败：HTTP ${response.status} ${response.statusText}`)
  }

  if (!contentType.includes('application/json')) {
    throw new Error(
      `机器列表接口返回了非 JSON 内容：${contentType || 'unknown'}，前 120 字符：${bodyText.slice(0, 120)}`,
    )
  }

  let payload: unknown
  try {
    payload = JSON.parse(bodyText) as unknown
  } catch (error) {
    throw new Error(
      `机器列表 JSON 解析失败：${error instanceof Error ? error.message : 'unknown error'}，前 120 字符：${bodyText.slice(0, 120)}`,
    )
  }

  return extractMachineRecords(payload).sort((left, right) => {
    const workshopOrder = left.workshop.localeCompare(right.workshop, 'zh-Hans-CN')
    if (workshopOrder !== 0) {
      return workshopOrder
    }

    return left.code.localeCompare(right.code, 'zh-Hans-CN')
  })
}

function extractMachineRecords(payload: unknown): MachineRecord[] {
  if (Array.isArray(payload)) {
    return payload.flatMap((item) => normalizeMachineRecord(item))
  }

  if (!payload || typeof payload !== 'object') {
    return []
  }

  const record = payload as Record<string, unknown>
  for (const key of ['data', 'items', 'results', 'machines', 'list']) {
    const value = record[key]
    if (Array.isArray(value)) {
      return value.flatMap((item) => normalizeMachineRecord(item, readString(record.workshop)))
    }
  }

  return []
}

function normalizeMachineRecord(value: unknown, inheritedWorkshop?: string): MachineRecord[] {
  if (!value || typeof value !== 'object') {
    return []
  }

  const record = value as Record<string, unknown>

  if (Array.isArray(record.machines)) {
    const workshop = readString(record.workshop) ?? inheritedWorkshop
    return record.machines.flatMap((item) => normalizeMachineRecord(item, workshop))
  }

  const code =
    readString(record.code) ??
    readString(record.machine_code) ??
    readString(record.machineCode) ??
    readString(record.device_addr) ??
    readString(record.deviceAddr)

  const workshop =
    readString(record.workshop) ??
    readString(record.workshop_name) ??
    readString(record.workshopName) ??
    readString(record.workshop_code) ??
    readString(record.workshopCode) ??
    inheritedWorkshop

  if (!code || !workshop) {
    return []
  }

  return [
    {
      code,
      workshop,
      name:
        readString(record.name) ??
        readString(record.machine_name) ??
        readString(record.machineName) ??
        readString(record.machine_model) ??
        readString(record.machineModel),
      deviceAddr: readString(record.device_addr) ?? readString(record.deviceAddr),
      deviceName: readString(record.device_name) ?? readString(record.deviceName),
    },
  ]
}

function readString(value: unknown) {
  if (typeof value === 'string') {
    const trimmed = value.trim()
    return trimmed || undefined
  }

  if (typeof value === 'number' || typeof value === 'bigint') {
    return String(value)
  }

  return undefined
}
