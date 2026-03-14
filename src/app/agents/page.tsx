'use client';

import { useState, useEffect, useCallback } from 'react';
import { Plus, Search, Filter, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { AgentCard } from '@/components/agents/agent-card';
import { CreateAgentDialog } from '@/components/agents/create-agent-dialog';
import { Agent, AgentRole, AgentStatus } from '@/types';
import { toast } from 'sonner';

interface AgentWithCounts extends Agent {
  taskCounts: {
    total: number;
    active: number;
  };
}

export default function AgentsPage() {
  const [agents, setAgents] = useState<AgentWithCounts[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<AgentRole | 'all'>('all');
  const [statusFilter, setStatusFilter] = useState<AgentStatus | 'all'>('all');
  const [showCreateDialog, setShowCreateDialog] = useState(false);

  const fetchAgents = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      
      if (searchQuery) params.append('search', searchQuery);
      if (roleFilter !== 'all') params.append('role', roleFilter);
      if (statusFilter !== 'all') params.append('status', statusFilter);
      
      const response = await fetch(`/api/agents?${params}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch agents');
      }
      
      const result = await response.json();
      setAgents(result.data || []);
    } catch (error) {
      console.error('Error fetching agents:', error);
      toast.error('Failed to load agents');
    } finally {
      setLoading(false);
    }
  }, [searchQuery, roleFilter, statusFilter]);

  useEffect(() => {
    fetchAgents();
  }, [fetchAgents]);

  const handleAgentCreated = (newAgent: Agent) => {
    setAgents(prev => [...prev, { ...newAgent, taskCounts: { total: 0, active: 0 } }]);
    toast.success('Agent created successfully');
  };

  const handleAgentDeleted = (agentId: number) => {
    setAgents(prev => prev.filter(agent => agent.id !== agentId));
    toast.success('Agent deleted successfully');
  };

  const handleAgentUpdated = (updatedAgent: Agent) => {
    setAgents(prev => prev.map(agent => 
      agent.id === updatedAgent.id 
        ? { ...updatedAgent, taskCounts: agent.taskCounts }
        : agent
    ));
    toast.success('Agent updated successfully');
  };

  // No client-side filtering needed since server-side filtering is already applied
  const filteredAgents = agents;

  const getStatusColor = (status: AgentStatus) => {
    switch (status) {
      case 'available': return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400';
      case 'busy': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400';
      case 'offline': return 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400';
    }
  };

  const getRoleColor = (role: AgentRole) => {
    switch (role) {
      case 'coder': return 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400';
      case 'reviewer': return 'bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-400';
      case 'tester': return 'bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-400';
      case 'devops': return 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400';
      case 'manager': return 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/20 dark:text-indigo-400';
    }
  };

  return (
    <div className="container mx-auto px-3 sm:px-6 py-4 sm:py-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 sm:mb-8">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight flex items-center gap-2 sm:gap-3">
            <Users className="h-6 w-6 sm:h-8 sm:w-8" />
            Agent Management
          </h1>
          <p className="text-sm sm:text-base text-muted-foreground mt-1 sm:mt-2">
            Manage your development team and track agent workloads
          </p>
        </div>
        <Button onClick={() => setShowCreateDialog(true)} className="flex items-center gap-2 min-h-[44px] w-full sm:w-auto">
          <Plus className="h-4 w-4" />
          Add Agent
        </Button>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-6 mb-4 sm:mb-8">
        <div className="bg-card border rounded-lg p-3 sm:p-6">
          <div className="flex items-center gap-2">
            <Badge className={getStatusColor('available')}>Available</Badge>
            <span className="text-2xl font-bold">
              {agents.filter(a => a.status === 'available').length}
            </span>
          </div>
        </div>
        <div className="bg-card border rounded-lg p-3 sm:p-6">
          <div className="flex items-center gap-2">
            <Badge className={getStatusColor('busy')}>Busy</Badge>
            <span className="text-2xl font-bold">
              {agents.filter(a => a.status === 'busy').length}
            </span>
          </div>
        </div>
        <div className="bg-card border rounded-lg p-3 sm:p-6">
          <div className="flex items-center gap-2">
            <Badge className={getStatusColor('offline')}>Offline</Badge>
            <span className="text-2xl font-bold">
              {agents.filter(a => a.status === 'offline').length}
            </span>
          </div>
        </div>
        <div className="bg-card border rounded-lg p-3 sm:p-6">
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            <span className="text-sm text-muted-foreground">Total Agents</span>
            <span className="text-2xl font-bold">{agents.length}</span>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-2 sm:gap-4 mb-4 sm:mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search agents by name or role..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 min-h-[44px]"
          />
        </div>
        <Select value={roleFilter} onValueChange={(value) => setRoleFilter(value as AgentRole | 'all')}>
          <SelectTrigger className="w-full sm:w-[180px]">
            <Filter className="h-4 w-4 mr-2" />
            <SelectValue placeholder="Filter by role" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Roles</SelectItem>
            <SelectItem value="coder">Coder</SelectItem>
            <SelectItem value="reviewer">Reviewer</SelectItem>
            <SelectItem value="tester">Tester</SelectItem>
            <SelectItem value="devops">DevOps</SelectItem>
            <SelectItem value="manager">Manager</SelectItem>
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as AgentStatus | 'all')}>
          <SelectTrigger className="w-full sm:w-[180px]">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="available">Available</SelectItem>
            <SelectItem value="busy">Busy</SelectItem>
            <SelectItem value="offline">Offline</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Agent Grid */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-6">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="bg-card border rounded-lg p-3 sm:p-6 animate-pulse">
              <div className="h-12 w-12 bg-muted rounded-full mb-4"></div>
              <div className="h-4 bg-muted rounded w-24 mb-2"></div>
              <div className="h-3 bg-muted rounded w-16 mb-4"></div>
              <div className="space-y-2">
                <div className="h-3 bg-muted rounded w-full"></div>
                <div className="h-3 bg-muted rounded w-3/4"></div>
              </div>
            </div>
          ))}
        </div>
      ) : filteredAgents.length === 0 ? (
        <div className="text-center py-12">
          <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">No agents found</h3>
          <p className="text-muted-foreground mb-4">
            {searchQuery || roleFilter !== 'all' || statusFilter !== 'all'
              ? 'Try adjusting your search or filters'
              : 'Get started by creating your first agent'
            }
          </p>
          {!searchQuery && roleFilter === 'all' && statusFilter === 'all' && (
            <Button onClick={() => setShowCreateDialog(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Create Agent
            </Button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-6">
          {filteredAgents.map((agent) => (
            <AgentCard
              key={agent.id}
              agent={agent}
              onDelete={handleAgentDeleted}
              onUpdate={handleAgentUpdated}
              getStatusColor={getStatusColor}
              getRoleColor={getRoleColor}
            />
          ))}
        </div>
      )}

      {/* Create Agent Dialog */}
      <CreateAgentDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
        onAgentCreated={handleAgentCreated}
      />
    </div>
  );
}