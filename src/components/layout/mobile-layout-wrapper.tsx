'use client'

import { useState, useEffect } from "react"
import { Header } from "./header"
import { Footer } from "./footer"
import { MobileSidebar } from "./mobile-sidebar"
import { MobileBottomNav } from "./mobile-bottom-nav"
import { WebSocketProvider } from "@/contexts/websocket-context"
import { WebSocketErrorBoundary } from "@/components/error-boundary"
import { useTheme } from "@/contexts/theme-context"
import { Toaster } from "sonner"
import { KeyboardShortcutsProvider } from "@/contexts/keyboard-shortcuts-context"
import { KeyboardShortcutsHelp } from "@/components/ui/keyboard-shortcuts-help"
import { useMediaQuery } from "@/hooks/use-media-query"

interface MobileLayoutWrapperProps {
  children: React.ReactNode
}

export function MobileLayoutWrapper({ children }: MobileLayoutWrapperProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const { actualTheme } = useTheme()
  
  // Responsive breakpoints
  const isMobile = useMediaQuery('(max-width: 768px)')
  const isTablet = useMediaQuery('(min-width: 768px) and (max-width: 1024px)')
  const isDesktop = useMediaQuery('(min-width: 1024px)')

  // Close sidebar on mobile when clicking outside
  useEffect(() => {
    if (isMobile && sidebarOpen) {
      const handleClickOutside = (event: MouseEvent) => {
        const target = event.target as Element
        if (!target.closest('[data-mobile-sidebar]') && !target.closest('[data-sidebar-trigger]')) {
          setSidebarOpen(false)
        }
      }
      
      document.addEventListener('click', handleClickOutside)
      return () => document.removeEventListener('click', handleClickOutside)
    }
  }, [isMobile, sidebarOpen])

  // Close sidebar when switching from mobile to desktop
  useEffect(() => {
    if (isDesktop) {
      setSidebarOpen(false)
    }
  }, [isDesktop])

  return (
    <KeyboardShortcutsProvider>
      <WebSocketErrorBoundary>
        <WebSocketProvider>
          <div className="flex h-screen overflow-hidden bg-background text-foreground transition-colors duration-300">
            {/* Mobile Sidebar Overlay */}
            {isMobile && (
              <MobileSidebar 
                isOpen={sidebarOpen}
                onClose={() => setSidebarOpen(false)}
              />
            )}

            {/* Desktop Sidebar - Hidden on mobile */}
            {isDesktop && (
              <div className="hidden lg:flex">
                {/* Original sidebar component will be used here */}
              </div>
            )}

            {/* Main Content Area */}
            <div className="flex-1 flex flex-col">
              {/* Mobile-Responsive Header */}
              <Header 
                sidebarCollapsed={false}
                isMobile={isMobile}
                onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
              />

              {/* Main Content */}
              <main className={`flex-1 transition-all duration-300 ${
                isMobile 
                  ? 'pt-16 pb-20 px-4 overflow-auto' // Mobile: account for bottom nav
                  : isTablet
                    ? 'pt-16 pb-12 px-6 overflow-auto' // Tablet
                    : 'pt-16 pb-12 px-6 overflow-auto' // Desktop
              } ${
                actualTheme === 'dark' 
                  ? 'bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950' 
                  : 'bg-gradient-to-br from-slate-50 via-white to-slate-50'
              }`}>
                <div className={`h-full w-full mx-auto ${
                  isMobile ? 'max-w-full' : 'max-w-7xl'
                }`}>
                  {children}
                </div>
              </main>

              {/* Mobile Bottom Navigation */}
              {isMobile && <MobileBottomNav />}

              {/* Desktop Footer */}
              {!isMobile && <Footer sidebarCollapsed={false} />}
            </div>
          </div>
          
          {/* Keyboard shortcuts help modal */}
          <KeyboardShortcutsHelp />
          
          {/* Global toast notifications - Mobile optimized */}
          <Toaster 
            theme={actualTheme} 
            position={isMobile ? "top-center" : "top-right"}
            toastOptions={{
              style: {
                ...(actualTheme === 'dark' ? {
                  background: 'rgb(30 41 59)',
                  border: '1px solid rgb(51 65 85)',
                  color: 'rgb(226 232 240)'
                } : {
                  background: 'rgb(255 255 255)',
                  border: '1px solid rgb(226 232 240)',
                  color: 'rgb(30 41 59)'
                }),
                ...(isMobile && {
                  width: '90vw',
                  maxWidth: '400px'
                })
              }
            }}
          />
        </WebSocketProvider>
      </WebSocketErrorBoundary>
    </KeyboardShortcutsProvider>
  )
}