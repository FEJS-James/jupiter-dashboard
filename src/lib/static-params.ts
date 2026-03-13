import fs from 'fs'
import path from 'path'

function loadData() {
  try {
    const dataPath = path.join(process.cwd(), 'public', 'data.json')
    const raw = fs.readFileSync(dataPath, 'utf-8')
    return JSON.parse(raw)
  } catch {
    return { tasks: [], projects: [], agents: [] }
  }
}

export function getTaskIds(): { id: string }[] {
  const data = loadData()
  return data.tasks.map((t: any) => ({ id: String(t.id) }))
}

export function getProjectIds(): { id: string }[] {
  const data = loadData()
  return data.projects.map((p: any) => ({ id: String(p.id) }))
}

export function getAgentIds(): { id: string }[] {
  const data = loadData()
  return data.agents.map((a: any) => ({ id: String(a.id) }))
}
