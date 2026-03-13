import { getAgentIds } from '@/lib/static-params'
import AgentDetail from './agent-detail'

export function generateStaticParams() {
  return getAgentIds()
}

export default function Page() {
  return <AgentDetail />
}
