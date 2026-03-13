import { getProjectIds } from '@/lib/static-params'
import ProjectDetail from './project-detail'

export function generateStaticParams() {
  return getProjectIds()
}

export default function Page() {
  return <ProjectDetail />
}
