import { useEffect, useMemo, useState, type ReactNode } from 'react'
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
  Sun,
  Users,
  X,
} from 'lucide-react'
import { Badge } from './components/ui/badge'
import { Button } from './components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './components/ui/card'
import { Input } from './components/ui/input'
import { appUrl, callbackUrl, isLogtoConfigured } from './lib/logto'
import { cn } from './lib/utils'
import { auditEvents, mockUsers, systemMetrics } from './lib/mock-data'

function App() {
  return (
    <Routes>
      <Route path="/sign-in" element={<SignInPage />} />
      <Route path="/callback" element={<CallbackPage />} />
      <Route element={<ProtectedRoute />}>
        <Route element={<Shell />}>
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/users" element={<UsersPage />} />
          <Route path="/settings" element={<SettingsPage />} />
        </Route>
      </Route>
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  )
}

function ProtectedRoute() {
  const { isAuthenticated, isLoading } = useLogto()
  const location = useLocation()

  if (isLoading) {
    return <FullScreenState title="Checking session" description="Preparing your admin workspace." />
  }

  if (!isAuthenticated) {
    return <Navigate to="/sign-in" replace state={{ from: location.pathname }} />
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
    void getIdTokenClaims().then(setClaims).catch(() => setClaims(undefined))
  }, [getIdTokenClaims])

  const displayName = claims?.name || claims?.email || claims?.sub || 'Signed in user'

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
        <Button variant="outline" size="sm" onClick={() => signOut(appUrl)}>
          <LogOut className="h-4 w-4" />
          <span className="hidden sm:inline">Sign out</span>
        </Button>
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
            {['Web app', 'Logto redirect', 'Mock data'].map((item) => (
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
            <SettingRow label="VITE_LOGTO_ENDPOINT" configured={Boolean(import.meta.env.VITE_LOGTO_ENDPOINT)} />
            <SettingRow label="VITE_LOGTO_APP_ID" configured={Boolean(import.meta.env.VITE_LOGTO_APP_ID)} />
            <SettingRow label="VITE_APP_URL" configured={Boolean(import.meta.env.VITE_APP_URL)} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Admin console scope</CardTitle>
            <CardDescription>First-version boundaries are intentionally narrow.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            <p>Authentication uses the Logto React SDK redirect flow.</p>
            <p>User data is mock data and does not mutate Logto resources.</p>
            <p>Protected pages require a real Logto session; fake login is not available.</p>
          </CardContent>
        </Card>
      </div>
    </Page>
  )
}

function SettingRow({ label, configured }: { label: string; configured: boolean }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-md border border-border p-3">
      <code className="text-xs sm:text-sm">{label}</code>
      <Badge variant={configured ? 'success' : 'secondary'}>{configured ? 'Configured' : 'Missing'}</Badge>
    </div>
  )
}

function SignInPage() {
  const { isAuthenticated, signIn } = useLogto()
  const location = useLocation()
  const from = (location.state as { from?: string } | null)?.from || '/dashboard'

  if (isAuthenticated) {
    return <Navigate to={from} replace />
  }

  return (
    <div className="grid min-h-screen place-items-center bg-background px-4 text-foreground">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Sign in to My Admin</CardTitle>
          <CardDescription>Use Logto to start a protected admin session.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {!isLogtoConfigured && (
            <div className="rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-950 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-100">
              Missing Logto configuration. Create `.env.local` from `.env.example` before signing in.
            </div>
          )}
          <Button className="w-full" disabled={!isLogtoConfigured} onClick={() => signIn(callbackUrl)}>
            <LogIn className="h-4 w-4" />
            Continue with Logto
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}

function CallbackPage() {
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

function Page({ title, description, children }: { title: string; description: string; children: ReactNode }) {
  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-semibold tracking-normal">{title}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{description}</p>
      </div>
      {children}
    </div>
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
