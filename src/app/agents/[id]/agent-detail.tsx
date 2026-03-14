'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import {
  ArrowLeft,
  Edit,
  User,
  Clock,
  CheckCircle,
  Calendar,
  Briefcase,
  TrendingUp,
  ChevronLeft,
  ChevronRight,
  Loader2,
  CircleDot,
  AlertCircle,
  ListFilter,
} from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { EditAgentDialog } from '@/components/agents/edit-agent-dialog';
import { Agent, AgentRole, AgentStatus } from '@/types';
import { toast } from 'sonner';

// ─── Types ───────────────────────────────────────────────────────────

interface AgentWithStats extends Agent {
  statistics: {
    totalTasks: number;
    activeTasks: number;
    completedTasks: number;
  };
  recentTasks: Array<{
    id: number;
    title: string;
    status: string;
    priority: string;
    updatedAt: string;
  }>;
}

interface TaskItem {
  id: number;
  title: string;
  status: string;
  priority: string;
  updatedAt: string;
  createdAt: string;
}

interface ActivityItem {
  id: number;
  action: string;
  details: Record<string, unknown>;
  timestamp: string;
  agent?: {
    id: number;
    name: string;
    role: string;
    color: string;
  };
}

// ─── Helpers ─────────────────────────────────────────────────────────

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

function getStatusConfig(status: AgentStatus) {
  const map: Record<AgentStatus, { label: string; dot: string; bg: string; text: string }> = {
    available: {
      label: 'Available',
      dot: 'bg-emerald-500',
      bg: 'bg-emerald-50 dark:bg-emerald-950/30',
      text: 'text-emerald-700 dark:text-emerald-400',
    },
    busy: {
      label: 'Busy',
      dot: 'bg-amber-500',
      bg: 'bg-amber-50 dark:bg-amber-950/30',
      text: 'text-amber-700 dark:text-amber-400',
    },
    offline: {
      label: 'Offline',
      dot: 'bg-slate-400',
      bg: 'bg-slate-100 dark:bg-slate-800/40',
      text: 'text-slate-600 dark:text-slate-400',
    },
  };
  return map[status];
}

function getRoleBadgeClasses(role: AgentRole): string {
  const map: Record<AgentRole, string> = {
    coder: 'bg-sky-50 text-sky-700 border-sky-200/60 dark:bg-sky-950/30 dark:text-sky-400 dark:border-sky-800/40',
    reviewer:
      'bg-violet-50 text-violet-700 border-violet-200/60 dark:bg-violet-950/30 dark:text-violet-400 dark:border-violet-800/40',
    tester:
      'bg-orange-50 text-orange-700 border-orange-200/60 dark:bg-orange-950/30 dark:text-orange-400 dark:border-orange-800/40',
    devops:
      'bg-rose-50 text-rose-700 border-rose-200/60 dark:bg-rose-950/30 dark:text-rose-400 dark:border-rose-800/40',
    manager:
      'bg-indigo-50 text-indigo-700 border-indigo-200/60 dark:bg-indigo-950/30 dark:text-indigo-400 dark:border-indigo-800/40',
  };
  return map[role];
}

function getTaskStatusConfig(status: string) {
  const map: Record<string, { label: string; classes: string; icon: React.ReactNode }> = {
    done: {
      label: 'Done',
      classes: 'bg-emerald-50 text-emerald-700 border-emerald-200/60',
      icon: <CheckCircle className="h-3 w-3" />,
    },
    'in-progress': {
      label: 'In Progress',
      classes: 'bg-sky-50 text-sky-700 border-sky-200/60',
      icon: <Loader2 className="h-3 w-3" />,
    },
    blocked: {
      label: 'Blocked',
      classes: 'bg-red-50 text-red-700 border-red-200/60',
      icon: <AlertCircle className="h-3 w-3" />,
    },
    'code-review': {
      label: 'Code Review',
      classes: 'bg-violet-50 text-violet-700 border-violet-200/60',
      icon: <CircleDot className="h-3 w-3" />,
    },
    testing: {
      label: 'Testing',
      classes: 'bg-orange-50 text-orange-700 border-orange-200/60',
      icon: <CircleDot className="h-3 w-3" />,
    },
    deploying: {
      label: 'Deploying',
      classes: 'bg-cyan-50 text-cyan-700 border-cyan-200/60',
      icon: <TrendingUp className="h-3 w-3" />,
    },
    backlog: {
      label: 'Backlog',
      classes: 'bg-slate-50 text-slate-600 border-slate-200/60',
      icon: <CircleDot className="h-3 w-3" />,
    },
  };
  return map[status] || { label: status, classes: 'bg-slate-50 text-slate-600 border-slate-200/60', icon: <CircleDot className="h-3 w-3" /> };
}

function getPriorityConfig(priority: string) {
  const map: Record<string, { label: string; classes: string }> = {
    urgent: { label: 'Urgent', classes: 'bg-red-50 text-red-700 border-red-200/60' },
    high: { label: 'High', classes: 'bg-orange-50 text-orange-700 border-orange-200/60' },
    medium: { label: 'Medium', classes: 'bg-amber-50 text-amber-700 border-amber-200/60' },
    low: { label: 'Low', classes: 'bg-slate-50 text-slate-600 border-slate-200/60' },
  };
  return map[priority] || { label: priority, classes: 'bg-slate-50 text-slate-600 border-slate-200/60' };
}

function formatRelativeTime(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function getActivityDescription(action: string, details: Record<string, unknown>): string {
  switch (action) {
    case 'created':
      return `Created task "${details.taskTitle || 'Unknown'}"`;
    case 'moved':
      return `Moved task from ${details.from || '?'} → ${details.to || '?'}`;
    case 'assigned':
      return `Assigned to task "${details.taskTitle || 'Unknown'}"`;
    case 'commented':
      return `Commented on a task`;
    case 'status_changed':
      return `Status changed: ${details.from || '?'} → ${details.to || '?'}`;
    default:
      return action.replace(/_/g, ' ').replace(/^\w/, (c) => c.toUpperCase());
  }
}

// ─── Sub-Components ──────────────────────────────────────────────────

function StatCard({
  icon,
  value,
  label,
  accentColor,
}: {
  icon: React.ReactNode;
  value: number;
  label: string;
  accentColor?: string;
}) {
  return (
    <div className="group relative overflow-hidden rounded-xl border border-slate-200/60 bg-white/80 p-5 shadow-sm transition-all hover:shadow-md dark:border-slate-800/60 dark:bg-slate-900/50">
      <div className="flex items-center gap-3">
        <div
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg"
          style={{
            backgroundColor: accentColor ? `${accentColor}12` : undefined,
            color: accentColor || undefined,
          }}
        >
          {icon}
        </div>
        <div>
          <p className="text-2xl font-semibold tracking-tight text-slate-900 dark:text-slate-100">
            {value}
          </p>
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">{label}</p>
        </div>
      </div>
    </div>
  );
}

function TaskRow({ task }: { task: TaskItem | AgentWithStats['recentTasks'][number] }) {
  const statusCfg = getTaskStatusConfig(task.status);
  const priorityCfg = getPriorityConfig(task.priority);

  return (
    <Link href={`/tasks/${task.id}`} className="block">
      <div className="group flex items-center justify-between rounded-lg border border-transparent px-4 py-3 transition-all hover:border-slate-200/60 hover:bg-white/60 dark:hover:border-slate-700/40 dark:hover:bg-slate-800/30">
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-slate-800 group-hover:text-slate-950 dark:text-slate-200 dark:group-hover:text-white">
            {task.title}
          </p>
          <div className="mt-1.5 flex items-center gap-2">
            <span
              className={`inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-[11px] font-medium ${statusCfg.classes}`}
            >
              {statusCfg.icon}
              {statusCfg.label}
            </span>
            <span
              className={`inline-flex items-center rounded-md border px-2 py-0.5 text-[11px] font-medium ${priorityCfg.classes}`}
            >
              {priorityCfg.label}
            </span>
          </div>
        </div>
        <span className="ml-4 shrink-0 text-xs text-slate-400 dark:text-slate-500">
          {formatRelativeTime(task.updatedAt)}
        </span>
      </div>
    </Link>
  );
}

function ActivityRow({ item }: { item: ActivityItem }) {
  return (
    <div className="flex items-start gap-3 px-4 py-3">
      <div className="mt-0.5 h-2 w-2 shrink-0 rounded-full bg-slate-300 dark:bg-slate-600" />
      <div className="min-w-0 flex-1">
        <p className="text-sm text-slate-700 dark:text-slate-300">
          {getActivityDescription(item.action, item.details || {})}
        </p>
        <p className="mt-0.5 text-xs text-slate-400 dark:text-slate-500">
          {formatRelativeTime(item.timestamp)}
        </p>
      </div>
    </div>
  );
}

// ─── Loading Skeleton ────────────────────────────────────────────────

function AgentDetailSkeleton() {
  return (
    <div className="min-h-screen bg-slate-50/80 dark:bg-slate-950">
      <div className="mx-auto max-w-6xl px-6 py-8">
        {/* Back button */}
        <div className="mb-8">
          <Skeleton className="h-9 w-32" />
        </div>

        {/* Header */}
        <div className="mb-8 flex items-start gap-5">
          <Skeleton className="h-16 w-16 rounded-2xl" />
          <div className="space-y-2">
            <Skeleton className="h-7 w-48" />
            <div className="flex gap-2">
              <Skeleton className="h-5 w-16" />
              <Skeleton className="h-5 w-20" />
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-[88px] rounded-xl" />
          ))}
        </div>

        {/* Content */}
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-5">
          <div className="lg:col-span-3">
            <Skeleton className="h-[400px] rounded-xl" />
          </div>
          <div className="lg:col-span-2">
            <Skeleton className="h-[400px] rounded-xl" />
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Main Component ──────────────────────────────────────────────────

export default function AgentDetailPage() {
  const params = useParams();
  const agentId = params.id as string;

  const [agent, setAgent] = useState<AgentWithStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [showEditDialog, setShowEditDialog] = useState(false);

  // Activity state
  const [activityItems, setActivityItems] = useState<ActivityItem[]>([]);
  const [activityLoading, setActivityLoading] = useState(false);

  // Task history state
  const [allTasks, setAllTasks] = useState<TaskItem[]>([]);
  const [tasksLoading, setTasksLoading] = useState(false);
  const [taskFilter, setTaskFilter] = useState<string>('all');
  const [taskPage, setTaskPage] = useState(1);
  const [taskTotal, setTaskTotal] = useState(0);
  const tasksPerPage = 10;

  // ─── Fetch Agent ─────────────────────────────────────────────────

  useEffect(() => {
    if (!agentId) return;

    const fetchAgent = async () => {
      try {
        const response = await fetch(`/api/agents/${agentId}`);
        if (!response.ok) {
          if (response.status === 404) {
            toast.error('Agent not found');
            return;
          }
          throw new Error('Failed to fetch agent');
        }
        const result = await response.json();
        setAgent(result.data);
      } catch (error) {
        console.error('Error fetching agent:', error);
        toast.error('Failed to load agent details');
      } finally {
        setLoading(false);
      }
    };

    fetchAgent();
  }, [agentId]);

  // ─── Fetch Activity ──────────────────────────────────────────────

  useEffect(() => {
    if (!agent) return;

    const fetchActivity = async () => {
      setActivityLoading(true);
      try {
        const response = await fetch(`/api/activity?agent=${agent.id}&limit=10`);
        if (response.ok) {
          const result = await response.json();
          const items = result.data?.data || result.data || [];
          setActivityItems(Array.isArray(items) ? items : []);
        }
      } catch (error) {
        console.error('Error fetching activity:', error);
      } finally {
        setActivityLoading(false);
      }
    };

    fetchActivity();
  }, [agent]);

  // ─── Fetch Task History ──────────────────────────────────────────

  const fetchTasks = useCallback(async () => {
    if (!agent) return;

    setTasksLoading(true);
    try {
      const params = new URLSearchParams({
        assignedAgent: agent.name,
        page: String(taskPage),
        limit: String(tasksPerPage),
      });
      if (taskFilter !== 'all') {
        params.set('status', taskFilter);
      }

      const response = await fetch(`/api/tasks?${params.toString()}`);
      if (response.ok) {
        const result = await response.json();
        const data = result.data;
        if (data && Array.isArray(data.data)) {
          setAllTasks(data.data);
          setTaskTotal(data.pagination?.total || data.data.length);
        } else if (Array.isArray(data)) {
          setAllTasks(data);
          setTaskTotal(data.length);
        } else {
          setAllTasks([]);
          setTaskTotal(0);
        }
      }
    } catch (error) {
      console.error('Error fetching tasks:', error);
    } finally {
      setTasksLoading(false);
    }
  }, [agent, taskPage, taskFilter, tasksPerPage]);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  // ─── Handlers ────────────────────────────────────────────────────

  const handleAgentUpdated = (updatedAgent: Agent) => {
    if (agent) {
      setAgent({ ...agent, ...updatedAgent });
    }
    toast.success('Agent updated successfully');
  };

  const totalPages = Math.max(1, Math.ceil(taskTotal / tasksPerPage));

  // ─── Loading State ───────────────────────────────────────────────

  if (loading) return <AgentDetailSkeleton />;

  // ─── Not Found ───────────────────────────────────────────────────

  if (!agent) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center bg-slate-50/80 dark:bg-slate-950">
        <div className="rounded-2xl border border-slate-200/60 bg-white/80 px-12 py-10 text-center shadow-sm dark:border-slate-800/60 dark:bg-slate-900/50">
          <User className="mx-auto mb-4 h-10 w-10 text-slate-300 dark:text-slate-600" />
          <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-200">
            Agent not found
          </h3>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            This agent doesn&apos;t exist or has been removed.
          </p>
          <Link href="/agents" className="mt-5 block">
            <Button variant="outline" size="sm">
              <ArrowLeft className="mr-2 h-3.5 w-3.5" />
              Back to Agents
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  const statusCfg = getStatusConfig(agent.status);
  const completionRate =
    agent.statistics.totalTasks > 0
      ? Math.round((agent.statistics.completedTasks / agent.statistics.totalTasks) * 100)
      : 0;
  const inProgressCount =
    agent.statistics.activeTasks;
  const pendingCount = agent.statistics.totalTasks - agent.statistics.completedTasks - inProgressCount;

  // ─── Render ──────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-slate-50/80 dark:bg-slate-950">
      <div className="mx-auto max-w-6xl px-6 py-8">
        {/* ── Back Button ──────────────────────────────────────── */}
        <div className="mb-8">
          <Link href="/agents">
            <Button
              variant="ghost"
              size="sm"
              className="gap-1.5 text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Agents
            </Button>
          </Link>
        </div>

        {/* ── Agent Header ─────────────────────────────────────── */}
        <div className="mb-8 flex items-start justify-between">
          <div className="flex items-start gap-5">
            {/* Avatar */}
            <Avatar
              className="h-16 w-16 rounded-2xl border-2 shadow-sm"
              style={{ borderColor: `${agent.color}30` }}
            >
              <AvatarImage src={agent.avatarUrl} className="rounded-2xl" />
              <AvatarFallback
                className="rounded-2xl text-lg font-semibold text-white"
                style={{ backgroundColor: agent.color }}
              >
                {getInitials(agent.name)}
              </AvatarFallback>
            </Avatar>

            <div>
              {/* Name */}
              <h1 className="text-xl font-semibold tracking-tight text-slate-900 dark:text-white">
                {agent.name}
              </h1>

              {/* Badges */}
              <div className="mt-2 flex flex-wrap items-center gap-2">
                {/* Role badge */}
                <span
                  className={`inline-flex items-center rounded-md border px-2.5 py-0.5 text-xs font-medium capitalize ${getRoleBadgeClasses(agent.role)}`}
                >
                  {agent.role}
                </span>

                {/* Status badge */}
                <span
                  className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-0.5 text-xs font-medium ${statusCfg.bg} ${statusCfg.text}`}
                >
                  <span className={`h-1.5 w-1.5 rounded-full ${statusCfg.dot}`} />
                  {statusCfg.label}
                </span>

                {/* Joined date */}
                <span className="inline-flex items-center gap-1 text-xs text-slate-400 dark:text-slate-500">
                  <Calendar className="h-3 w-3" />
                  Joined {formatDate(agent.createdAt)}
                </span>
              </div>
            </div>
          </div>

          {/* Edit button */}
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5 border-slate-200/80 text-slate-600 hover:text-slate-900 dark:border-slate-700/60 dark:text-slate-400"
            onClick={() => setShowEditDialog(true)}
          >
            <Edit className="h-3.5 w-3.5" />
            Edit
          </Button>
        </div>

        {/* ── Current Task Banner ──────────────────────────────── */}
        {agent.currentTaskId && agent.status === 'busy' && (
          <div
            className="mb-8 flex items-center gap-3 rounded-xl border px-5 py-4"
            style={{
              borderColor: `${agent.color}25`,
              backgroundColor: `${agent.color}06`,
            }}
          >
            <div
              className="flex h-8 w-8 items-center justify-center rounded-lg"
              style={{ backgroundColor: `${agent.color}15` }}
            >
              <Loader2
                className="h-4 w-4 animate-spin"
                style={{ color: agent.color }}
              />
            </div>
            <div className="flex-1">
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                Currently working on
              </p>
              <Link href={`/tasks/${agent.currentTaskId}`}>
                <span
                  className="text-sm font-medium transition-colors hover:underline"
                  style={{ color: agent.color }}
                >
                  Task #{agent.currentTaskId}
                </span>
              </Link>
            </div>
          </div>
        )}

        {/* ── Stats Cards ──────────────────────────────────────── */}
        <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            icon={<Briefcase className="h-5 w-5" />}
            value={agent.statistics.totalTasks}
            label="Total Tasks"
            accentColor={agent.color}
          />
          <StatCard
            icon={<Clock className="h-5 w-5" />}
            value={inProgressCount}
            label="In Progress"
            accentColor="#0ea5e9"
          />
          <StatCard
            icon={<CheckCircle className="h-5 w-5" />}
            value={agent.statistics.completedTasks}
            label="Completed"
            accentColor="#10b981"
          />
          <StatCard
            icon={<TrendingUp className="h-5 w-5" />}
            value={completionRate}
            label="Completion Rate %"
            accentColor="#8b5cf6"
          />
        </div>

        {/* ── Content Grid ─────────────────────────────────────── */}
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-5">
          {/* ── Recent Tasks (3/5) ─────────────────────────────── */}
          <div className="lg:col-span-3">
            <div className="rounded-xl border border-slate-200/60 bg-white/80 shadow-sm dark:border-slate-800/60 dark:bg-slate-900/50">
              <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4 dark:border-slate-800/60">
                <h2 className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                  Recent Tasks
                </h2>
                <Link href={`/tasks?agent=${agent.name}`}>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 text-xs text-slate-500 hover:text-slate-800"
                  >
                    View all
                  </Button>
                </Link>
              </div>

              <div className="divide-y divide-slate-50 dark:divide-slate-800/40">
                {Array.isArray(agent.recentTasks) && agent.recentTasks.length > 0 ? (
                  agent.recentTasks.map((task) => <TaskRow key={task.id} task={task} />)
                ) : (
                  <div className="py-12 text-center">
                    <Briefcase className="mx-auto mb-2 h-8 w-8 text-slate-200 dark:text-slate-700" />
                    <p className="text-sm text-slate-400 dark:text-slate-500">
                      No tasks assigned yet
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* ── Activity Feed (2/5) ────────────────────────────── */}
          <div className="lg:col-span-2">
            <div className="rounded-xl border border-slate-200/60 bg-white/80 shadow-sm dark:border-slate-800/60 dark:bg-slate-900/50">
              <div className="border-b border-slate-100 px-5 py-4 dark:border-slate-800/60">
                <h2 className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                  Recent Activity
                </h2>
              </div>

              <div className="divide-y divide-slate-50 dark:divide-slate-800/40">
                {activityLoading ? (
                  <div className="space-y-3 p-5">
                    {[1, 2, 3, 4].map((i) => (
                      <div key={i} className="flex items-start gap-3">
                        <Skeleton className="mt-1 h-2 w-2 rounded-full" />
                        <div className="flex-1 space-y-1">
                          <Skeleton className="h-4 w-full" />
                          <Skeleton className="h-3 w-16" />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : Array.isArray(activityItems) && activityItems.length > 0 ? (
                  activityItems.map((item) => <ActivityRow key={item.id} item={item} />)
                ) : (
                  <div className="py-12 text-center">
                    <Clock className="mx-auto mb-2 h-8 w-8 text-slate-200 dark:text-slate-700" />
                    <p className="text-sm text-slate-400 dark:text-slate-500">
                      No activity recorded
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* ── Task History (Full Width) ────────────────────────── */}
        <div className="mt-8">
          <div className="rounded-xl border border-slate-200/60 bg-white/80 shadow-sm dark:border-slate-800/60 dark:bg-slate-900/50">
            {/* Header with filter */}
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-5 py-4 dark:border-slate-800/60">
              <h2 className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                Task History
              </h2>

              <div className="flex items-center gap-2">
                <ListFilter className="h-3.5 w-3.5 text-slate-400" />
                <Select
                  value={taskFilter}
                  onValueChange={(v) => {
                    setTaskFilter(v);
                    setTaskPage(1);
                  }}
                >
                  <SelectTrigger className="h-8 w-[140px] border-slate-200/60 text-xs dark:border-slate-700/60">
                    <SelectValue placeholder="All statuses" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All statuses</SelectItem>
                    <SelectItem value="backlog">Backlog</SelectItem>
                    <SelectItem value="in-progress">In Progress</SelectItem>
                    <SelectItem value="code-review">Code Review</SelectItem>
                    <SelectItem value="testing">Testing</SelectItem>
                    <SelectItem value="deploying">Deploying</SelectItem>
                    <SelectItem value="done">Done</SelectItem>
                    <SelectItem value="blocked">Blocked</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Task list */}
            <div className="divide-y divide-slate-50 dark:divide-slate-800/40">
              {tasksLoading ? (
                <div className="space-y-1 p-2">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <Skeleton key={i} className="h-[68px] rounded-lg" />
                  ))}
                </div>
              ) : Array.isArray(allTasks) && allTasks.length > 0 ? (
                allTasks.map((task) => <TaskRow key={task.id} task={task} />)
              ) : (
                <div className="py-12 text-center">
                  <Briefcase className="mx-auto mb-2 h-8 w-8 text-slate-200 dark:text-slate-700" />
                  <p className="text-sm text-slate-400 dark:text-slate-500">
                    {taskFilter !== 'all'
                      ? `No ${taskFilter} tasks found`
                      : 'No task history'}
                  </p>
                </div>
              )}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between border-t border-slate-100 px-5 py-3 dark:border-slate-800/60">
                <p className="text-xs text-slate-400 dark:text-slate-500">
                  Page {taskPage} of {totalPages} · {taskTotal} tasks
                </p>
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 w-7 p-0"
                    disabled={taskPage <= 1}
                    onClick={() => setTaskPage((p) => Math.max(1, p - 1))}
                  >
                    <ChevronLeft className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 w-7 p-0"
                    disabled={taskPage >= totalPages}
                    onClick={() => setTaskPage((p) => Math.min(totalPages, p + 1))}
                  >
                    <ChevronRight className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Edit Dialog ──────────────────────────────────────── */}
      <EditAgentDialog
        agent={agent}
        open={showEditDialog}
        onOpenChange={setShowEditDialog}
        onAgentUpdated={handleAgentUpdated}
      />
    </div>
  );
}
