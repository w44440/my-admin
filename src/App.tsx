import { useEffect, useEffectEvent, useMemo, useRef, useState, type ReactNode } from 'react'
import { Navigate, NavLink, Outlet, Route, Routes, useLocation, useNavigate } from 'react-router-dom'
import { useHandleSignInCallback, useLogto, type IdTokenClaims } from '@logto/react'
import {
  Activity,
  Bell,
  ChevronDown,
  LayoutDashboard,
  LogIn,
  LogOut,
  Menu,
  Moon,
  PanelLeftClose,
  Search,
  Settings,
  RefreshCw,
  Sun,
  Users,
  X,
} from 'lucide-react'
import { Badge } from './components/ui/badge'
import { Button } from './components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './components/ui/card'
import { Input } from './components/ui/input'
import { appUrl, authEnabled, authMisconfigured, authRequired, callbackUrl } from './lib/logto'
import {
  formatCollectedAt,
  lightsWsUrl,
  normalizeLightStatus,
  type DevicePayload,
  type SignalLightsMessage,
} from './lib/signal-lights'
import { fetchMachines, type MachineRecord } from './lib/machines'
import { cn } from './lib/utils'
import { auditEvents, mockUsers, systemMetrics } from './lib/mock-data'

function App() {
  return (
    <Routes>
      <Route path="/" element={<EntryPage />} />
      <Route path="/sign-in" element={<Navigate to="/" replace />} />
      <Route path="/callback" element={<CallbackPage />} />
        <Route element={<ProtectedRoute />}>
        <Route element={<Shell />}>
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/signal-lights" element={<SignalLightsPage />} />
          <Route path="/users" element={<UsersPage />} />
          <Route path="/settings" element={<SettingsPage />} />
        </Route>
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

function ProtectedRoute() {
  const { isAuthenticated, isLoading } = useLogto()
  const location = useLocation()

  if (!authRequired) {
    return <Outlet />
  }

  if (authMisconfigured) {
    return <Navigate to="/" replace state={{ from: location.pathname, authMisconfigured: true }} />
  }

  if (isLoading) {
    return <FullScreenState title="Checking session" description="Preparing your admin workspace." />
  }

  if (!isAuthenticated) {
    return <Navigate to="/" replace state={{ from: location.pathname }} />
  }

  return <Outlet />
}

function Shell() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [collapsed, setCollapsed] = useState(false)
  const [theme, setTheme] = useTheme()

  return (
    <div className="min-h-screen bg-background text-foreground">
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-40 border-r border-border bg-card transition-all duration-200 lg:translate-x-0',
          collapsed ? 'lg:w-20' : 'lg:w-64',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full',
          'w-64',
        )}
      >
        <Sidebar collapsed={collapsed} closeMobile={() => setSidebarOpen(false)} />
      </aside>
      {sidebarOpen && (
        <button
          className="fixed inset-0 z-30 bg-background/70 backdrop-blur-sm lg:hidden"
          onClick={() => setSidebarOpen(false)}
          aria-label="Close navigation"
        />
      )}
      <div className={cn('min-h-screen transition-[padding] duration-200', collapsed ? 'lg:pl-20' : 'lg:pl-64')}>
        <TopBar
          theme={theme}
          setTheme={setTheme}
          collapsed={collapsed}
          toggleCollapsed={() => setCollapsed((value) => !value)}
          openMobile={() => setSidebarOpen(true)}
        />
        <main className="px-4 py-5 sm:px-6 lg:px-8">
          <Outlet />
        </main>
      </div>
    </div>
  )
}

function Sidebar({ collapsed, closeMobile }: { collapsed: boolean; closeMobile: () => void }) {
  const links = [
    { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { to: '/signal-lights', label: '机器状态', icon: Activity },
    { to: '/users', label: 'Users', icon: Users },
    { to: '/settings', label: 'Settings', icon: Settings },
  ]

  return (
    <div className="flex h-full flex-col">
      <div className="flex h-16 items-center gap-3 border-b border-border px-4">
        <div className="grid h-9 w-9 place-items-center rounded-md bg-primary text-sm font-semibold text-primary-foreground">
          MA
        </div>
        {!collapsed && (
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold">My Admin</p>
            <p className="truncate text-xs text-muted-foreground">Operations Shell</p>
          </div>
        )}
        <Button className="ml-auto lg:hidden" variant="ghost" size="icon" onClick={closeMobile} aria-label="Close menu">
          <X className="h-4 w-4" />
        </Button>
      </div>
      <nav className="flex-1 space-y-1 p-3">
        {links.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            onClick={closeMobile}
            className={({ isActive }) =>
              cn(
                'flex h-10 items-center gap-3 rounded-md px-3 text-sm font-medium text-muted-foreground transition hover:bg-accent hover:text-accent-foreground',
                isActive && 'bg-accent text-accent-foreground',
                collapsed && 'justify-center px-0',
              )
            }
            title={collapsed ? item.label : undefined}
          >
            <item.icon className="h-4 w-4 shrink-0" />
            {!collapsed && <span>{item.label}</span>}
          </NavLink>
        ))}
      </nav>
      <div className="border-t border-border p-3">
        <div className={cn('rounded-md bg-muted p-3', collapsed && 'px-2')}>
          {!collapsed ? (
            <>
              <p className="text-xs font-medium">Logto auth</p>
              <p className="mt-1 text-xs text-muted-foreground">SPA session only. No Management API.</p>
            </>
          ) : (
            <LogIn className="mx-auto h-4 w-4 text-muted-foreground" />
          )}
        </div>
      </div>
    </div>
  )
}

function TopBar({
  theme,
  setTheme,
  collapsed,
  toggleCollapsed,
  openMobile,
}: {
  theme: 'light' | 'dark'
  setTheme: (theme: 'light' | 'dark') => void
  collapsed: boolean
  toggleCollapsed: () => void
  openMobile: () => void
}) {
  const { signOut, getIdTokenClaims } = useLogto()
  const [claims, setClaims] = useState<IdTokenClaims>()

  useEffect(() => {
    if (!authEnabled) {
      setClaims(undefined)
      return
    }

    void getIdTokenClaims().then(setClaims).catch(() => setClaims(undefined))
  }, [getIdTokenClaims])

  const displayName = authEnabled ? claims?.name || claims?.email || claims?.sub || 'Signed in user' : authRequired ? 'Auth setup required' : 'Public preview'

  return (
    <header className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b border-border bg-background/90 px-4 backdrop-blur sm:px-6 lg:px-8">
      <Button variant="ghost" size="icon" className="lg:hidden" onClick={openMobile} aria-label="Open navigation">
        <Menu className="h-4 w-4" />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        className="hidden lg:inline-flex"
        onClick={toggleCollapsed}
        aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
      >
        <PanelLeftClose className={cn('h-4 w-4 transition', collapsed && 'rotate-180')} />
      </Button>
      <div className="relative hidden w-full max-w-md sm:block">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input className="pl-9" placeholder="Search users, settings, audit events..." />
      </div>
      <div className="ml-auto flex items-center gap-2">
        <Button variant="ghost" size="icon" aria-label="Notifications">
          <Bell className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          aria-label="Toggle theme"
        >
          {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </Button>
        <div className="hidden items-center gap-2 rounded-md border border-border px-3 py-2 text-sm md:flex">
          <span className="max-w-40 truncate">{displayName}</span>
          <ChevronDown className="h-4 w-4 text-muted-foreground" />
        </div>
        {authEnabled ? (
          <Button variant="outline" size="sm" onClick={() => signOut(appUrl)}>
            <LogOut className="h-4 w-4" />
            <span className="hidden sm:inline">Sign out</span>
          </Button>
        ) : (
          <Badge variant="secondary">{authRequired ? 'Auth pending' : 'Preview mode'}</Badge>
        )}
      </div>
    </header>
  )
}

function DashboardPage() {
  return (
    <Page title="Dashboard" description="Operational overview for the admin console.">
      <div className="grid gap-4 md:grid-cols-3">
        {systemMetrics.map((metric) => (
          <Card key={metric.label}>
            <CardHeader className="pb-2">
              <CardDescription>{metric.label}</CardDescription>
              <CardTitle className="text-2xl">{metric.value}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Activity className="h-4 w-4 text-emerald-600" />
                {metric.change}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
      <div className="grid gap-4 lg:grid-cols-[1.35fr_0.65fr]">
        <Card>
          <CardHeader>
            <CardTitle>Recent activity</CardTitle>
            <CardDescription>Mock events used to exercise the operations shell.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {auditEvents.slice(0, 5).map((event) => (
              <div key={event.id} className="flex items-start justify-between gap-4 border-b border-border pb-3 last:border-0 last:pb-0">
                <div>
                  <p className="text-sm font-medium">{event.action}</p>
                  <p className="text-sm text-muted-foreground">{event.actor}</p>
                </div>
                <span className="shrink-0 text-xs text-muted-foreground">{event.time}</span>
              </div>
            ))}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>System status</CardTitle>
            <CardDescription>Static health signals for the first version.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {[
              'Web app',
              authEnabled ? 'Logto redirect' : authRequired ? 'Logto setup' : 'Public entry',
              'Mock data',
            ].map((item) => (
              <div key={item} className="flex items-center justify-between rounded-md border border-border p-3">
                <span className="text-sm">{item}</span>
                <Badge variant="success">Ready</Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </Page>
  )
}

function UsersPage() {
  return (
    <Page title="Users" description="Mock user list for the operations shell.">
      <Card>
        <CardHeader className="flex-row items-center justify-between gap-4">
          <div>
            <CardTitle>Mock users</CardTitle>
            <CardDescription>This table does not call the Logto Management API.</CardDescription>
          </div>
          <Button variant="outline" size="sm">Export</Button>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="w-full min-w-[680px] text-left text-sm">
            <thead className="border-b border-border text-xs uppercase text-muted-foreground">
              <tr>
                <th className="py-3 pr-4 font-medium">Name</th>
                <th className="py-3 pr-4 font-medium">Email</th>
                <th className="py-3 pr-4 font-medium">Role</th>
                <th className="py-3 pr-4 font-medium">Status</th>
                <th className="py-3 pr-4 font-medium">Last active</th>
              </tr>
            </thead>
            <tbody>
              {mockUsers.map((user) => (
                <tr key={user.email} className="border-b border-border last:border-0">
                  <td className="py-3 pr-4 font-medium">{user.name}</td>
                  <td className="py-3 pr-4 text-muted-foreground">{user.email}</td>
                  <td className="py-3 pr-4">{user.role}</td>
                  <td className="py-3 pr-4">
                    <Badge variant={user.status === 'Active' ? 'success' : 'secondary'}>{user.status}</Badge>
                  </td>
                  <td className="py-3 pr-4 text-muted-foreground">{user.lastActive}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </Page>
  )
}

type LightCard = {
  no: number
  stateLabel: string
  tone: 'red' | 'yellow' | 'green' | 'off' | 'unknown' | 'no-data'
  countLabel: string
  updatedAtLabel: string
}

type SessionState = 'stopped' | 'connecting' | 'live' | 'reconnecting' | 'error'

type MachineSessionQuery = {
  workshop: string
  machineCode: string
  deviceKey: string
}

function SignalLightsPage() {
  const [machines, setMachines] = useState<MachineRecord[]>([])
  const [workshop, setWorkshop] = useState('')
  const [machineSearch, setMachineSearch] = useState('')
  const [machineCode, setMachineCode] = useState('')
  const [machineLoading, setMachineLoading] = useState(false)
  const [machineError, setMachineError] = useState<string | null>(null)
  const [enabled, setEnabled] = useState(false)
  const [sessionState, setSessionState] = useState<SessionState>('stopped')
  const [statusNote, setStatusNote] = useState<string>('已停止')
  const [lastError, setLastError] = useState<string | null>(null)
  const [displayCards, setDisplayCards] = useState<LightCard[]>([])
  const [sessionHasData, setSessionHasData] = useState(false)
  const cacheRef = useRef<Record<string, DevicePayload>>({})
  const socketRef = useRef<WebSocket | null>(null)
  const reconnectTimerRef = useRef<number | null>(null)
  const connectTimerRef = useRef<number | null>(null)
  const manualCloseRef = useRef(false)
  const sessionIdRef = useRef(0)
  const activeQueryRef = useRef<MachineSessionQuery | null>(null)
  const initialMachineLoadRef = useRef(false)

  const workshopOptions = useMemo(
    () => Array.from(new Set(machines.map((machine) => machine.workshop))),
    [machines],
  )

  const filteredMachines = useMemo(() => {
    if (!workshop) {
      return machines
    }

    return machines.filter((machine) => machine.workshop === workshop)
  }, [machines, workshop])

  const selectedMachine = useMemo(
    () => filteredMachines.find((machine) => machine.code === machineCode.trim()),
    [filteredMachines, machineCode],
  )

  const currentQuery = useMemo<MachineSessionQuery | null>(() => {
    if (!selectedMachine) {
      return null
    }

    return {
      workshop: selectedMachine.workshop,
      machineCode: selectedMachine.code,
      deviceKey: selectedMachine.deviceAddr ?? selectedMachine.code,
    }
  }, [selectedMachine])

  const clearReconnectTimer = useEffectEvent(() => {
    if (reconnectTimerRef.current !== null) {
      window.clearTimeout(reconnectTimerRef.current)
      reconnectTimerRef.current = null
    }
  })

  const clearConnectTimer = useEffectEvent(() => {
    if (connectTimerRef.current !== null) {
      window.clearTimeout(connectTimerRef.current)
      connectTimerRef.current = null
    }
  })

  const closeSocket = useEffectEvent(() => {
    clearConnectTimer()
    clearReconnectTimer()
    const socket = socketRef.current
    if (socket) {
      socketRef.current = null
      socket.onopen = null
      socket.onmessage = null
      socket.onerror = null
      socket.onclose = null
      socket.close()
    }
  })

  const stopSession = useEffectEvent((note = '已停止') => {
    sessionIdRef.current += 1
    activeQueryRef.current = null
    manualCloseRef.current = true
    closeSocket()
    setEnabled(false)
    setSessionState('stopped')
    setStatusNote(note)
    setLastError(null)
    setSessionHasData(false)
  })

  const scheduleReconnect = useEffectEvent((sessionId: number) => {
    clearReconnectTimer()
    reconnectTimerRef.current = window.setTimeout(() => {
      if (!manualCloseRef.current && activeQueryRef.current && sessionIdRef.current === sessionId) {
        connect(activeQueryRef.current, sessionId, true)
      }
    }, 2000)
  })

  const updateViewFromCache = useEffectEvent((query: MachineSessionQuery) => {
    const device = cacheRef.current[query.deviceKey]
    setDisplayCards(buildCards(device))
    setSessionHasData(Boolean(device))
  })

  const connect = useEffectEvent((query: MachineSessionQuery, sessionId: number, isReconnect = false) => {
    if (!lightsWsUrl) {
      setSessionState('error')
      setStatusNote('未配置 WebSocket 地址')
      setLastError('请设置 VITE_LIGHTS_WS_URL')
      setSessionHasData(false)
      setEnabled(false)
      return
    }

    const wsUrl = lightsWsUrl
    activeQueryRef.current = query
    clearConnectTimer()
    clearReconnectTimer()
    manualCloseRef.current = true
    closeSocket()
    manualCloseRef.current = false
    setSessionState((state) => (state === 'reconnecting' ? 'reconnecting' : 'connecting'))
    setStatusNote(isReconnect ? '重连中…' : '连接中…')
    setLastError(null)

    connectTimerRef.current = window.setTimeout(() => {
      connectTimerRef.current = null

      if (manualCloseRef.current || sessionIdRef.current !== sessionId) {
        return
      }

      const socket = new WebSocket(wsUrl)
      socketRef.current = socket

      socket.onopen = () => {
        if (socketRef.current !== socket || sessionIdRef.current !== sessionId) {
          return
        }

        setSessionState('connecting')
        setStatusNote('等待首帧快照…')
      }

      socket.onmessage = (event) => {
        if (socketRef.current !== socket || sessionIdRef.current !== sessionId) {
          return
        }

        try {
          const message = JSON.parse(event.data) as SignalLightsMessage
          if (message.type === 'snapshot') {
            cacheRef.current = Object.fromEntries(message.devices.map((device) => [device.device_addr, device]))
          } else if (message.type === 'update') {
            cacheRef.current = {
              ...cacheRef.current,
              [message.device.device_addr]: message.device,
            }
          } else {
            return
          }

          setSessionState('live')
          setStatusNote('实时更新中')
          setLastError(null)
          updateViewFromCache(query)
        } catch {
          setLastError('收到无法解析的 WebSocket 消息')
        }
      }

      socket.onerror = () => {
        if (socketRef.current !== socket || sessionIdRef.current !== sessionId) {
          return
        }

        setLastError('WebSocket 连接异常')
      }

      socket.onclose = () => {
        if (socketRef.current === socket) {
          socketRef.current = null
        }

        if (manualCloseRef.current || sessionIdRef.current !== sessionId) {
          return
        }

        setSessionState('reconnecting')
        setStatusNote('重连中…')
        setLastError((value) => value ?? '连接已断开，正在重连')
        scheduleReconnect(sessionId)
      }
    }, 0)
  })

  const refreshMachines = useEffectEvent(async (signal?: AbortSignal) => {
    setMachineLoading(true)

    try {
      const nextMachines = await fetchMachines(signal)
      if (signal?.aborted) {
        return
      }

      setMachines(nextMachines)
      setMachineError(nextMachines.length === 0 ? '未获取到机器列表' : null)

      const nextSelection = resolveMachineSelection(nextMachines, workshop, machineCode)
      const selectionChanged = nextSelection.workshop !== workshop || nextSelection.machineCode !== machineCode

      if (selectionChanged) {
        setWorkshop(nextSelection.workshop)
        setMachineCode(nextSelection.machineCode)
        setMachineSearch(nextSelection.machineCode)

        if (enabled) {
          stopSession('机器列表已更新，请重新开启')
        }
      } else if (!machineSearch) {
        setMachineSearch(nextSelection.machineCode)
      }
    } catch (error) {
      if (signal?.aborted) {
        return
      }

      setMachineError(error instanceof Error ? error.message : '获取机器列表失败')
    } finally {
      if (!signal?.aborted) {
        setMachineLoading(false)
      }
    }
  })

  useEffect(() => {
    if (initialMachineLoadRef.current) {
      return
    }

    initialMachineLoadRef.current = true
    const controller = new AbortController()
    void refreshMachines(controller.signal)

    return () => {
      controller.abort()
      manualCloseRef.current = true
      clearReconnectTimer()
      closeSocket()
    }
  }, [])

  useEffect(() => {
    if (!enabled || !currentQuery || !activeQueryRef.current) {
      return
    }

    if (activeQueryRef.current.deviceKey !== currentQuery.deviceKey) {
      stopSession('条件已变更，请重新开启')
    }
  }, [currentQuery, enabled, stopSession])

  const applyMachineSelection = () => {
    const nextMachine = filteredMachines.find((machine) => machine.code === machineSearch.trim())
    if (!nextMachine) {
      setMachineError('未找到对应的 machine code')
      return
    }

    setMachineError(null)
    if (enabled && activeQueryRef.current?.deviceKey !== (nextMachine.deviceAddr ?? nextMachine.code)) {
      stopSession('条件已变更，请重新开启')
    }

    setWorkshop(nextMachine.workshop)
    setMachineCode(nextMachine.code)
    setMachineSearch(nextMachine.code)
  }

  const startSession = useEffectEvent(() => {
    if (!currentQuery) {
      setMachineError('请选择可用的 machine code')
      return
    }

    const nextSessionId = sessionIdRef.current + 1
    sessionIdRef.current = nextSessionId
    setEnabled(true)
    setSessionHasData(false)
    connect(currentQuery, nextSessionId)
  })

  const statusText =
    sessionState === 'live'
      ? '实时更新中'
      : sessionState === 'connecting'
        ? '连接中…'
        : sessionState === 'reconnecting'
          ? '重连中…'
          : sessionState === 'error'
            ? '连接失败'
            : statusNote

  const showLoading = enabled && !sessionHasData && (sessionState === 'connecting' || sessionState === 'reconnecting')
  const currentMachineSummary = currentQuery
    ? `${currentQuery.workshop} · ${currentQuery.machineCode}`
    : machineSearch
      ? `未匹配 machine code：${machineSearch}`
      : '未选择 machine code'

  return (
    <Page title="机器状态" description="按车间和 machine code 查询状态推送。">
      <div className="grid gap-4 xl:grid-cols-[380px_minmax(0,1fr)]">
        <Card>
          <CardHeader>
            <CardTitle>查询条件</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <LabeledField label="车间">
              <select
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm outline-none transition focus-visible:ring-2 focus-visible:ring-ring"
                value={workshop}
                onChange={(event) => {
                  const nextWorkshop = event.target.value
                  const nextWorkshopMachines = machines.filter((machine) => machine.workshop === nextWorkshop)
                  const nextMachine = nextWorkshopMachines[0]

                  setWorkshop(nextWorkshop)
                  setMachineCode(nextMachine?.code ?? '')
                  setMachineSearch(nextMachine?.code ?? '')
                }}
                disabled={machineLoading || workshopOptions.length === 0}
              >
                {workshopOptions.length === 0 ? (
                  <option value="">暂无车间</option>
                ) : (
                  workshopOptions.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))
                )}
              </select>
            </LabeledField>
            <LabeledField label="machine code">
              <div className="space-y-2">
                <Input
                  list="machine-code-options"
                  value={machineSearch}
                  onChange={(event) => setMachineSearch(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') {
                      event.preventDefault()
                      applyMachineSelection()
                    }
                  }}
                  placeholder="输入 machine code"
                  disabled={machineLoading || workshopOptions.length === 0}
                />
                <datalist id="machine-code-options">
                  {filteredMachines.map((machine) => (
                    <option key={`${machine.workshop}-${machine.code}`} value={machine.code}>
                      {machine.name ? `${machine.code} · ${machine.name}` : machine.code}
                    </option>
                  ))}
                </datalist>
                <div className="flex flex-wrap items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={applyMachineSelection}
                    disabled={!machineSearch.trim() || !filteredMachines.some((machine) => machine.code === machineSearch.trim())}
                  >
                    <Search className="h-4 w-4" />
                    应用 machine code
                  </Button>
                  <span className="text-xs text-muted-foreground">候选 {filteredMachines.length} 台</span>
                </div>
              </div>
            </LabeledField>
            <div className="rounded-md border border-border bg-muted/50 p-3">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-medium">机器列表</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {machineLoading ? '正在加载…' : machineError ? machineError : `已加载 ${machines.length} 台机器`}
                  </p>
                </div>
                <Button variant="outline" size="sm" onClick={() => void refreshMachines()}>
                  <RefreshCw className={cn('h-4 w-4', machineLoading && 'animate-spin')} />
                  获取机器
                </Button>
              </div>
              {machineError && <p className="mt-3 text-sm text-amber-700 dark:text-amber-300">{machineError}</p>}
            </div>
            <div className="rounded-md border border-border bg-muted/50 p-3">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-medium">状态</p>
                  <p className="mt-1 text-sm text-muted-foreground">{statusText}</p>
                </div>
                <Button onClick={() => (enabled ? stopSession() : startSession())} disabled={!currentQuery || machineLoading || workshopOptions.length === 0}>
                  {enabled ? '关闭' : '开启'}
                </Button>
              </div>
              <p className="mt-3 text-sm text-muted-foreground">当前选择：{currentMachineSummary}</p>
              {lastError && <p className="mt-2 text-sm text-amber-700 dark:text-amber-300">{lastError}</p>}
              {!lightsWsUrl && <p className="mt-3 text-sm text-amber-700 dark:text-amber-300">缺少 `VITE_LIGHTS_WS_URL` 配置。</p>}
            </div>
          </CardContent>
        </Card>
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-border bg-card px-4 py-3">
            <div className="min-w-0 text-sm font-medium">
              <div className="truncate">{currentMachineSummary}</div>
              <div className="mt-1 text-xs text-muted-foreground">
                {selectedMachine?.name || selectedMachine?.deviceName || '机器状态推送'}
              </div>
            </div>
            <Badge variant={sessionState === 'live' ? 'success' : 'secondary'}>{statusText}</Badge>
          </div>
          {showLoading ? (
            <Card>
              <CardContent className="py-12">
                <div className="text-center">
                  <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                  <p className="text-sm font-medium">等待快照</p>
                </div>
              </CardContent>
            </Card>
          ) : sessionHasData ? (
            <div className="grid gap-4 xl:grid-cols-3">
              {displayCards.map((card) => (
                <SignalLightCard key={card.no} card={card} />
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="py-12">
                <div className="text-center text-sm text-muted-foreground">
                  <p className="font-medium text-foreground">暂无机器状态</p>
                  <p className="mt-1">选择车间和 machine code 后点击“开启”接收后端推送。</p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </Page>
  )
}

function resolveMachineSelection(machines: MachineRecord[], currentWorkshop: string, currentMachineCode: string) {
  const exactWorkshopMachine = machines.find(
    (machine) => machine.workshop === currentWorkshop && machine.code === currentMachineCode,
  )
  if (exactWorkshopMachine) {
    return {
      workshop: exactWorkshopMachine.workshop,
      machineCode: exactWorkshopMachine.code,
    }
  }

  if (!currentWorkshop) {
    const globalMatch = machines.find((machine) => machine.code === currentMachineCode)
    if (globalMatch) {
      return {
        workshop: globalMatch.workshop,
        machineCode: globalMatch.code,
      }
    }
  }

  const workshopMachines = currentWorkshop ? machines.filter((machine) => machine.workshop === currentWorkshop) : []
  if (workshopMachines.length > 0) {
    return {
      workshop: currentWorkshop,
      machineCode: workshopMachines[0].code,
    }
  }

  const firstMachine = machines[0]
  if (firstMachine) {
    return {
      workshop: firstMachine.workshop,
      machineCode: firstMachine.code,
    }
  }

  return {
    workshop: '',
    machineCode: '',
  }
}

function SettingsPage() {
  return (
    <Page title="Settings" description="Application-level settings and Logto environment checks.">
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Logto configuration</CardTitle>
            <CardDescription>Configure these values in `.env.local` before signing in.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <SettingRow label="VITE_REQUIRE_AUTH" configured={authRequired} configuredLabel="Enabled" missingLabel="Disabled" />
            <SettingRow label="VITE_LOGTO_ENDPOINT" configured={Boolean(import.meta.env.VITE_LOGTO_ENDPOINT)} />
            <SettingRow label="VITE_LOGTO_APP_ID" configured={Boolean(import.meta.env.VITE_LOGTO_APP_ID)} />
            <SettingRow label="VITE_APP_URL" configured={Boolean(import.meta.env.VITE_APP_URL)} />
            <SettingRow label="VITE_LIGHTS_WS_URL" configured={Boolean(lightsWsUrl)} />
            <SettingRow label="VITE_MACHINES_API_URL" configured={Boolean(import.meta.env.VITE_MACHINES_API_URL)} configuredLabel="Override" missingLabel="Proxy /api/machines" />
            <SettingRow label="Preview mode" configured={!authRequired} configuredLabel="Enabled" missingLabel="Off" />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Admin console scope</CardTitle>
            <CardDescription>First-version boundaries are intentionally narrow.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            <p>Authentication can be toggled at build time with `VITE_REQUIRE_AUTH`.</p>
            <p>User data is mock data and does not mutate Logto resources.</p>
            <p>Signal light status is streamed from the backend over WebSocket.</p>
            <p>
              {authEnabled
                ? 'Protected pages require a real Logto session.'
                : authRequired
                  ? 'Authentication is required, but Logto is not configured yet.'
                  : 'The app is running in public preview mode with no login requirement.'}
            </p>
          </CardContent>
        </Card>
      </div>
    </Page>
  )
}

function SettingRow({
  label,
  configured,
  configuredLabel = 'Configured',
  missingLabel = 'Missing',
}: {
  label: string
  configured: boolean
  configuredLabel?: string
  missingLabel?: string
}) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-md border border-border p-3">
      <code className="text-xs sm:text-sm">{label}</code>
      <Badge variant={configured ? 'success' : 'secondary'}>{configured ? configuredLabel : missingLabel}</Badge>
    </div>
  )
}

function EntryPage() {
  const { isAuthenticated, signIn } = useLogto()
  const location = useLocation()
  const navigate = useNavigate()
  const from = (location.state as { from?: string } | null)?.from || '/dashboard'

  return (
    <div className="grid min-h-screen place-items-center bg-background px-4 text-foreground">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>My Admin</CardTitle>
          <CardDescription>
            {authEnabled
              ? 'Use Logto to start a protected admin session.'
              : authRequired
                ? 'Authentication is required before the admin console can be opened.'
                : 'Open the public preview of the admin console.'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {authMisconfigured && (
            <div className="rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-950 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-100">
              `VITE_REQUIRE_AUTH=true` is enabled, but Logto is not fully configured yet. Set `VITE_LOGTO_ENDPOINT` and
              `VITE_LOGTO_APP_ID` before turning on login.
            </div>
          )}
          {authEnabled ? (
            isAuthenticated ? (
              <Button className="w-full" onClick={() => navigate(from)}>
                Open admin console
              </Button>
            ) : (
              <Button className="w-full" onClick={() => signIn(callbackUrl)}>
                <LogIn className="h-4 w-4" />
                Continue with Logto
              </Button>
            )
          ) : (
            <Button className="w-full" disabled={authRequired} onClick={() => navigate('/dashboard')}>
              {authRequired ? 'Waiting for Logto configuration' : 'Open preview'}
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

function CallbackPage() {
  if (!authEnabled) {
    return <Navigate to="/" replace />
  }

  return <CallbackHandler />
}

function CallbackHandler() {
  const navigate = useNavigate()
  const { isLoading } = useHandleSignInCallback(() => {
    navigate('/dashboard', { replace: true })
  })

  if (isLoading) {
    return <FullScreenState title="Completing sign in" description="Logto is returning you to the admin console." />
  }

  return null
}

function FullScreenState({ title, description }: { title: string; description: string }) {
  return (
    <div className="grid min-h-screen place-items-center bg-background px-4 text-foreground">
      <div className="text-center">
        <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        <h1 className="text-lg font-semibold">{title}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{description}</p>
      </div>
    </div>
  )
}

function Page({ title, description, children }: { title: string; description?: string; children: ReactNode }) {
  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-semibold tracking-normal">{title}</h1>
        {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}
      </div>
      {children}
    </div>
  )
}

function LabeledField({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="space-y-2">
      <span className="text-sm font-medium">{label}</span>
      {children}
    </label>
  )
}

function SignalLightCard({ card }: { card: LightCard }) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-xl">灯号 {card.no}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-3">
          <span className={cn('h-4 w-4 rounded-full border', lightToneClasses[card.tone])} />
          <span className="text-sm font-medium">{card.stateLabel}</span>
        </div>
        <div className="rounded-md border border-border p-3">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">计件数</p>
          <p className="mt-1 text-2xl font-semibold">{card.countLabel}</p>
        </div>
        <div className="text-sm text-muted-foreground">更新时间：{card.updatedAtLabel}</div>
      </CardContent>
    </Card>
  )
}

function useTheme() {
  const [theme, setThemeState] = useState<'light' | 'dark'>(() => {
    const stored = localStorage.getItem('theme')
    return stored === 'dark' || stored === 'light' ? stored : 'light'
  })

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark')
    localStorage.setItem('theme', theme)
  }, [theme])

  const setTheme = useMemo(() => setThemeState, [])

  return [theme, setTheme] as const
}

export default App

const lightToneClasses: Record<LightCard['tone'], string> = {
  red: 'border-red-200 bg-red-500',
  yellow: 'border-amber-200 bg-amber-400',
  green: 'border-emerald-200 bg-emerald-500',
  off: 'border-slate-200 bg-slate-400',
  unknown: 'border-violet-200 bg-violet-400',
  'no-data': 'border-slate-300 bg-transparent',
}

function buildCards(device: DevicePayload | undefined) {
  if (!device) {
    return []
  }

  return [...device.lights]
    .sort((left, right) => left.no - right.no)
    .map((light) => {
      const normalized = normalizeLightStatus(light.status_name)

      return {
        no: light.no,
        stateLabel: normalized.label,
        tone: normalized.tone,
        countLabel: String(light.green_count),
        updatedAtLabel: formatCollectedAt(device.collected_at),
      }
    })
}
