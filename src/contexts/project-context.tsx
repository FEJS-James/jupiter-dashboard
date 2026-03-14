'use client'

import { createContext, useContext, useState, useCallback, ReactNode } from 'react'

interface ProjectContextValue {
  /** Currently selected project ID, or null for "all projects" */
  selectedProjectId: number | null
  /** Update the selected project */
  setSelectedProjectId: (id: number | null) => void
}

const ProjectContext = createContext<ProjectContextValue | undefined>(undefined)

export function ProjectProvider({ children }: { children: ReactNode }) {
  const [selectedProjectId, setSelectedProjectId] = useState<number | null>(null)

  return (
    <ProjectContext.Provider value={{ selectedProjectId, setSelectedProjectId }}>
      {children}
    </ProjectContext.Provider>
  )
}

export function useProjectContext(): ProjectContextValue {
  const context = useContext(ProjectContext)
  if (!context) {
    throw new Error('useProjectContext must be used within a ProjectProvider')
  }
  return context
}
