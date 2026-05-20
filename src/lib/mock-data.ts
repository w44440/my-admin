export const systemMetrics = [
  {
    label: 'Active sessions',
    value: '1,284',
    change: '+12.4% from yesterday',
  },
  {
    label: 'Pending reviews',
    value: '38',
    change: '6 require attention',
  },
  {
    label: 'System uptime',
    value: '99.98%',
    change: 'All core checks passing',
  },
]

export const auditEvents = [
  {
    id: 'evt_01',
    actor: 'Maya Chen',
    action: 'Updated workspace access policy',
    time: '4m ago',
  },
  {
    id: 'evt_02',
    actor: 'Noah Smith',
    action: 'Exported user activity report',
    time: '18m ago',
  },
  {
    id: 'evt_03',
    actor: 'Ava Johnson',
    action: 'Reviewed integration settings',
    time: '41m ago',
  },
  {
    id: 'evt_04',
    actor: 'Liam Patel',
    action: 'Archived stale invitation',
    time: '1h ago',
  },
  {
    id: 'evt_05',
    actor: 'Emma Garcia',
    action: 'Opened audit trail details',
    time: '2h ago',
  },
]

export const mockUsers = [
  {
    name: 'Maya Chen',
    email: 'maya@example.com',
    role: 'Operations lead',
    status: 'Active',
    lastActive: '4 minutes ago',
  },
  {
    name: 'Noah Smith',
    email: 'noah@example.com',
    role: 'Support manager',
    status: 'Active',
    lastActive: '18 minutes ago',
  },
  {
    name: 'Ava Johnson',
    email: 'ava@example.com',
    role: 'Analyst',
    status: 'Invited',
    lastActive: 'Pending',
  },
  {
    name: 'Liam Patel',
    email: 'liam@example.com',
    role: 'Auditor',
    status: 'Active',
    lastActive: '1 hour ago',
  },
  {
    name: 'Emma Garcia',
    email: 'emma@example.com',
    role: 'Admin',
    status: 'Active',
    lastActive: '2 hours ago',
  },
]
