import TaskDetail from './task-detail'

export default function Page({ params }: { params: Promise<{ id: string }> }) {
  return <TaskDetail params={params} />
}
