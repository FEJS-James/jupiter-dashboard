/** Generate breadcrumbs from the current pathname */
export interface Breadcrumb {
  label: string
  href: string
}

const ROUTE_LABELS: Record<string, string> = {
  '': 'Dashboard',
  'tasks': 'Tasks',
  'projects': 'Projects',
  'agents': 'Agents',
  'analytics': 'Analytics',
  'preferences': 'Preferences',
  'activity': 'Activity',
  'notifications': 'Notifications',
  'new': 'New',
  'edit': 'Edit',
  'components-demo': 'Components',
}

export function generateBreadcrumbs(pathname: string): Breadcrumb[] {
  const segments = pathname.split('/').filter(Boolean)

  // Always start with Dashboard
  const crumbs: Breadcrumb[] = [{ label: 'Dashboard', href: '/' }]

  let currentPath = ''
  for (const segment of segments) {
    currentPath += `/${segment}`
    const label = ROUTE_LABELS[segment] ?? formatSegment(segment)
    crumbs.push({ label, href: currentPath })
  }

  return crumbs
}

/** Format a URL segment into a human-readable label */
function formatSegment(segment: string): string {
  // Numeric IDs — show as-is prefixed
  if (/^\d+$/.test(segment)) return `#${segment}`

  // Kebab/snake case to title case
  return segment
    .replace(/[-_]/g, ' ')
    .replace(/\b\w/g, c => c.toUpperCase())
}
