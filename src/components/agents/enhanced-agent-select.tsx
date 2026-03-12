'use client';

import { useState, useEffect } from 'react';
import { Check, ChevronDown, Users, Circle, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Agent, AgentRole, AgentStatus } from '@/types';
import { toast } from 'sonner';

interface AgentWithWorkload extends Agent {
  taskCounts?: {
    total: number;
    active: number;
  };
}

interface EnhancedAgentSelectProps {
  value?: string;
  onValueChange: (value: string) => void;
  placeholder?: string;
  agents?: AgentWithWorkload[];
  className?: string;
  disabled?: boolean;
  showWorkload?: boolean;
  filterByStatus?: AgentStatus[];
  filterByRole?: AgentRole[];
}

export function EnhancedAgentSelect({
  value,
  onValueChange,
  placeholder = "Select agent...",
  agents = [],
  className,
  disabled = false,
  showWorkload = true,
  filterByStatus,
  filterByRole,
}: EnhancedAgentSelectProps) {
  const [agentsList, setAgentsList] = useState<AgentWithWorkload[]>([]);
  const [loading, setLoading] = useState(!agents.length);

  // Fetch agents if not provided
  useEffect(() => {
    if (agents.length > 0) {
      setAgentsList(agents);
      setLoading(false);
      return;
    }

    const fetchAgents = async () => {
      try {
        setLoading(true);
        const response = await fetch('/api/agents');
        if (!response.ok) throw new Error('Failed to fetch agents');
        
        const result = await response.json();
        setAgentsList(result.data || []);
      } catch (error) {
        console.error('Error fetching agents:', error);
        toast.error('Failed to load agents');
      } finally {
        setLoading(false);
      }
    };

    fetchAgents();
  }, [agents]);

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const getStatusColor = (status: AgentStatus) => {
    switch (status) {
      case 'available': return 'text-green-500';
      case 'busy': return 'text-yellow-500';
      case 'offline': return 'text-gray-500';
      default: return 'text-gray-500';
    }
  };

  const getStatusIcon = (status: AgentStatus) => {
    switch (status) {
      case 'available': return '🟢';
      case 'busy': return '🟡';
      case 'offline': return '🔴';
      default: return '⚫';
    }
  };

  const getWorkloadColor = (active: number, total: number) => {
    if (total === 0) return 'text-muted-foreground';
    const percentage = (active / total) * 100;
    if (percentage < 30) return 'text-green-600';
    if (percentage < 70) return 'text-yellow-600';
    return 'text-red-600';
  };

  // Filter agents based on provided filters
  const filteredAgents = agentsList.filter(agent => {
    if (filterByStatus && filterByStatus.length > 0 && !filterByStatus.includes(agent.status)) {
      return false;
    }
    if (filterByRole && filterByRole.length > 0 && !filterByRole.includes(agent.role)) {
      return false;
    }
    return true;
  });

  // Sort agents: available first, then by workload
  const sortedAgents = filteredAgents.sort((a, b) => {
    // Available agents first
    if (a.status === 'available' && b.status !== 'available') return -1;
    if (b.status === 'available' && a.status !== 'available') return 1;
    
    // Then by workload (fewer active tasks first)
    const aActive = a.taskCounts?.active || 0;
    const bActive = b.taskCounts?.active || 0;
    return aActive - bActive;
  });

  const selectedAgent = value && value !== 'unassigned' ? agentsList.find(agent => agent.name === value) : null;

  if (loading) {
    return (
      <Select disabled>
        <SelectTrigger className={cn("bg-slate-800 border-slate-600 text-slate-100", className)}>
          <SelectValue placeholder="Loading agents..." />
        </SelectTrigger>
      </Select>
    );
  }

  return (
    <Select value={value || 'unassigned'} onValueChange={onValueChange} disabled={disabled}>
      <SelectTrigger className={cn("bg-slate-800 border-slate-600 text-slate-100", className)}>
        {selectedAgent ? (
          <div className="flex items-center gap-2 truncate">
            <Avatar className="h-5 w-5" style={{ backgroundColor: selectedAgent.color + '20' }}>
              <AvatarImage src={selectedAgent.avatarUrl} />
              <AvatarFallback
                className="text-xs font-semibold text-white"
                style={{ backgroundColor: selectedAgent.color }}
              >
                {getInitials(selectedAgent.name)}
              </AvatarFallback>
            </Avatar>
            <span className="truncate">{selectedAgent.name}</span>
            <span className="text-xs">{getStatusIcon(selectedAgent.status)}</span>
            <Badge variant="secondary" className="text-xs">
              {selectedAgent.role}
            </Badge>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-muted-foreground" />
            <span className="text-muted-foreground">Unassigned</span>
          </div>
        )}
      </SelectTrigger>
      <SelectContent className="bg-slate-800 border-slate-600">
        {/* Unassigned option */}
        <SelectItem value="unassigned" className="text-slate-100">
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-muted-foreground" />
            <span>Unassigned</span>
          </div>
        </SelectItem>

        {/* Available agents */}
        {sortedAgents.map((agent) => (
          <SelectItem key={agent.id} value={agent.name} className="text-slate-100">
            <div className="flex items-center gap-2 w-full">
              <Avatar className="h-6 w-6" style={{ backgroundColor: agent.color + '20' }}>
                <AvatarImage src={agent.avatarUrl} />
                <AvatarFallback
                  className="text-xs font-semibold text-white"
                  style={{ backgroundColor: agent.color }}
                >
                  {getInitials(agent.name)}
                </AvatarFallback>
              </Avatar>
              
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-medium truncate">{agent.name}</span>
                  <span className="text-xs">{getStatusIcon(agent.status)}</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Badge variant="secondary" className="text-xs">
                    {agent.role}
                  </Badge>
                  {showWorkload && agent.taskCounts && (
                    <span className={getWorkloadColor(agent.taskCounts.active, agent.taskCounts.total)}>
                      {agent.taskCounts.active}/{agent.taskCounts.total} tasks
                    </span>
                  )}
                  {agent.status === 'busy' && (
                    <AlertCircle className="h-3 w-3 text-yellow-500" />
                  )}
                </div>
              </div>
            </div>
          </SelectItem>
        ))}

        {sortedAgents.length === 0 && (
          <SelectItem value="no-agents" disabled className="text-slate-400">
            No agents available
          </SelectItem>
        )}
      </SelectContent>
    </Select>
  );
}