'use client'

import { useState, useEffect } from "react"
import { Sidebar } from "./sidebar"
import { Header } from "./header"
import { Footer } from "./footer"
import { MobileLayoutWrapper } from "./mobile-layout-wrapper"
import { WebSocketProvider } from "@/contexts/websocket-context"
import { WebSocketErrorBoundary } from "@/components/error-boundary"
import { useTheme } from "@/contexts/theme-context"
import { Toaster } from "sonner"
import { KeyboardShortcutsProvider } from "@/contexts/keyboard-shortcuts-context"
import { KeyboardShortcutsHelp } from "@/components/ui/keyboard-shortcuts-help"
import { useMediaQuery } from "@/hooks/use-media-query"

interface LayoutWrapperProps {
  children: React.ReactNode
}

export function LayoutWrapper({ children }: LayoutWrapperProps) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const { actualTheme } = useTheme()
  const isMobile = useMediaQuery('(max-width: 768px)')

  // Use mobile layout on mobile devices
  if (isMobile) {
    return <MobileLayoutWrapper>{children}</MobileLayoutWrapper>
  }

  // Listen for sidebar collapse changes
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 1024) {
        setSidebarCollapsed(true)
      }
    }

    window.addEventListener('resize', handleResize)
    handleResize() // Check on initial load

    return () => window.removeEventListener('resize', handleResize)
  }, [])

  return (
    <KeyboardShortcutsProvider>
      <WebSocketErrorBoundary>
        <WebSocketProvider>
          <div className="flex h-screen overflow-hidden bg-background text-foreground transition-colors duration-300">
        {/* Sidebar */}
        <Sidebar onCollapseChange={setSidebarCollapsed} />

        {/* Main Content Area */}
        <div 
          className="flex-1 flex flex-col transition-all duration-300"
          style={{
            marginLeft: sidebarCollapsed ? '64px' : '280px'
          }}
        >
          {/* Header */}
          <Header sidebarCollapsed={sidebarCollapsed} />

          {/* Main Content */}
          <main className={`flex-1 pt-16 pb-12 px-6 overflow-auto transition-all duration-300 ${
            actualTheme === 'dark' 
              ? 'bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950' 
              : 'bg-gradient-to-br from-slate-50 via-white to-slate-50'
          }`}>
            <div className="h-full w-full max-w-7xl mx-auto">
              {children}
            </div>
          </main>

          {/* Footer */}
          <Footer sidebarCollapsed={sidebarCollapsed} />
          </div>
          </div>
          
          {/* Keyboard shortcuts help modal */}
          <KeyboardShortcutsHelp />
          
          {/* Global toast notifications */}
          <Toaster 
            theme={actualTheme} 
            position="top-right"
            toastOptions={{
              style: actualTheme === 'dark' ? {
                background: 'rgb(30 41 59)',
                border: '1px solid rgb(51 65 85)',
                color: 'rgb(226 232 240)'
              } : {
                background: 'rgb(255 255 255)',
                border: '1px solid rgb(226 232 240)',
                color: 'rgb(30 41 59)'
              }
            }}
          />
        </WebSocketProvider>
      </WebSocketErrorBoundary>
    </KeyboardShortcutsProvider>
  )
}