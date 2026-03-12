'use client';

import { useState, useEffect } from 'react';
import { Check, ChevronDown, Users, Circle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Agent, AgentRole, AgentStatus } from '@/types';

interface AgentWithWorkload extends Agent {
  taskCounts?: {
    total: number;
    active: number;
  };
}

interface AgentSelectProps {
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

export function AgentSelect({
  value,
  onValueChange,
  placeholder = "Select agent...",
  agents = [],
  className,
  disabled = false,
  showWorkload = true,
  filterByStatus,
  filterByRole,
}: AgentSelectProps) {
  const [open, setOpen] = useState(false);
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

  const selectedAgent = value ? agentsList.find(agent => agent.name === value) : null;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn(
            "w-full justify-between bg-slate-800 border-slate-600 text-slate-100 hover:bg-slate-700",
            className
          )}
          disabled={disabled}
        >
          {selectedAgent ? (
            <div className="flex items-center gap-2 truncate">
              <Avatar className="h-6 w-6" style={{ backgroundColor: selectedAgent.color + '20' }}>
                <AvatarImage src={selectedAgent.avatarUrl} />
                <AvatarFallback
                  className="text-xs font-semibold text-white"
                  style={{ backgroundColor: selectedAgent.color }}
                >
                  {getInitials(selectedAgent.name)}
                </AvatarFallback>
              </Avatar>
              <div className="flex items-center gap-2 truncate">
                <span className="truncate">{selectedAgent.name}</span>
                <Circle className={cn("h-2 w-2 fill-current", getStatusColor(selectedAgent.status))} />
                <Badge variant="secondary" className="text-xs">
                  {selectedAgent.role}
                </Badge>
              </div>
            </div>
          ) : value === 'unassigned' ? (
            <span className="text-muted-foreground">Unassigned</span>
          ) : (
            <span className="text-muted-foreground">{placeholder}</span>
          )}
          <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-full p-0 bg-slate-800 border-slate-600" align="start">
        <Command className="bg-slate-800">
          <CommandInput 
            placeholder="Search agents..." 
            className="bg-slate-800 text-slate-100 border-slate-600"
          />
          <CommandEmpty className="text-slate-400">
            {loading ? "Loading agents..." : "No agents found."}
          </CommandEmpty>
          <CommandGroup>
            {/* Unassigned option */}
            <CommandItem
              value="unassigned"
              onSelect={() => {
                onValueChange('unassigned');
                setOpen(false);
              }}
              className="text-slate-100 hover:bg-slate-700"
            >
              <div className="flex items-center gap-2 w-full">
                <Users className="h-4 w-4 text-muted-foreground" />
                <span>Unassigned</span>
                <Check
                  className={cn(
                    "ml-auto h-4 w-4",
                    value === 'unassigned' ? "opacity-100" : "opacity-0"
                  )}
                />
              </div>
            </CommandItem>

            {/* Available agents */}
            {sortedAgents.map((agent) => (
              <CommandItem
                key={agent.id}
                value={agent.name}
                onSelect={() => {
                  onValueChange(agent.name);
                  setOpen(false);
                }}
                className="text-slate-100 hover:bg-slate-700"
              >
                <div className="flex items-center gap-3 w-full">
                  <Avatar className="h-8 w-8" style={{ backgroundColor: agent.color + '20' }}>
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
                      <Circle className={cn("h-2 w-2 fill-current", getStatusColor(agent.status))} />
                    </div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Badge variant="secondary" className="text-xs">
                        {agent.role}
                      </Badge>
                      {showWorkload && agent.taskCounts && (
                        <span className={getWorkloadColor(agent.taskCounts.active, agent.taskCounts.total)}>
                          {agent.taskCounts.active} active
                        </span>
                      )}
                    </div>
                  </div>
                  
                  <Check
                    className={cn(
                      "ml-2 h-4 w-4",
                      value === agent.name ? "opacity-100" : "opacity-0"
                    )}
                  />
                </div>
              </CommandItem>
            ))}
          </CommandGroup>
        </Command>
      </PopoverContent>
    </Popover>
  );
}