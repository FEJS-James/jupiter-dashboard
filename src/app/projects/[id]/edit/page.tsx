import { getProjectIds } from '@/lib/static-params'
import ProjectEdit from './project-edit'

export function generateStaticParams() {
  return getProjectIds()
}

export default function Page() {
  return <ProjectEdit />
}
