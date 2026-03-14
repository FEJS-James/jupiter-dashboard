'use client'

import dynamic from 'next/dynamic'
import { Skeleton } from '@/components/ui/skeleton'

function PreferenceSkeleton() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-6 w-48" />
      <Skeleton className="h-10 w-full" />
      <Skeleton className="h-10 w-full" />
      <Skeleton className="h-10 w-full" />
    </div>
  )
}

export const LazyDashboardPreferences = dynamic(
  () => import('@/components/preferences/dashboard-preferences').then(mod => ({ default: mod.DashboardPreferences })),
  { loading: () => <PreferenceSkeleton />, ssr: false },
)

export const LazyDisplayPreferences = dynamic(
  () => import('@/components/preferences/display-preferences').then(mod => ({ default: mod.DisplayPreferences })),
  { loading: () => <PreferenceSkeleton />, ssr: false },
)

export const LazyNotificationPreferencesPanel = dynamic(
  () => import('@/components/preferences/notification-preferences').then(mod => ({ default: mod.NotificationPreferencesPanel })),
  { loading: () => <PreferenceSkeleton />, ssr: false },
)

export const LazyAccessibilityPreferences = dynamic(
  () => import('@/components/preferences/accessibility-preferences').then(mod => ({ default: mod.AccessibilityPreferences })),
  { loading: () => <PreferenceSkeleton />, ssr: false },
)

export const LazyProductivityPreferences = dynamic(
  () => import('@/components/preferences/productivity-preferences').then(mod => ({ default: mod.ProductivityPreferences })),
  { loading: () => <PreferenceSkeleton />, ssr: false },
)

export const LazyAdvancedPreferences = dynamic(
  () => import('@/components/preferences/advanced-preferences').then(mod => ({ default: mod.AdvancedPreferences })),
  { loading: () => <PreferenceSkeleton />, ssr: false },
)
