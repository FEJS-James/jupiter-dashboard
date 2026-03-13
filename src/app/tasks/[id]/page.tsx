import { getTaskIds } from '@/lib/static-params'
import TaskDetail from './task-detail'

export function generateStaticParams() {
  return getTaskIds()
}

export default function Page({ params }: { params: Promise<{ id: string }> }) {
  return <TaskDetail params={params} />
}
