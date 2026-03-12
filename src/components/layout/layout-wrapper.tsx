'use client'

import { useState, useEffect } from "react"
import { Sidebar } from "./sidebar"
import { Header } from "./header"
import { Footer } from "./footer"

interface LayoutWrapperProps {
  children: React.ReactNode
}

export function LayoutWrapper({ children }: LayoutWrapperProps) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)

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
    <div className="flex h-screen overflow-hidden">
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
        <main className="flex-1 pt-16 pb-12 px-6 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 overflow-auto">
          <div className="h-full w-full max-w-7xl mx-auto">
            {children}
          </div>
        </main>

        {/* Footer */}
        <Footer sidebarCollapsed={sidebarCollapsed} />
      </div>
    </div>
  )
}