'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { ArrowLeft, Edit, User, Activity, Clock, CheckCircle, Calendar, Briefcase } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { EditAgentDialog } from '@/components/agents/edit-agent-dialog';
import { Agent, AgentRole, AgentStatus } from '@/types';
import { toast } from 'sonner';

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

export default function AgentDetailPage() {
  const params = useParams();
  const agentId = params.id as string;
  
  const [agent, setAgent] = useState<AgentWithStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [showEditDialog, setShowEditDialog] = useState(false);

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

  const handleAgentUpdated = (updatedAgent: Agent) => {
    if (agent) {
      setAgent({
        ...agent,
        ...updatedAgent,
      });
    }
    toast.success('Agent updated successfully');
  };

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

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400';
      case 'high': return 'bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-400';
      case 'medium': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400';
      case 'low': return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400';
    }
  };

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'done': return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400';
      case 'in-progress': return 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400';
      case 'blocked': return 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400';
      case 'code-review': return 'bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-400';
      case 'testing': return 'bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-400';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400';
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto px-6 py-8">
        <div className="animate-pulse">
          <div className="h-8 bg-muted rounded w-64 mb-6"></div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-1 space-y-6">
              <div className="bg-card border rounded-lg p-6">
                <div className="flex items-center gap-4 mb-6">
                  <div className="h-16 w-16 bg-muted rounded-full"></div>
                  <div>
                    <div className="h-6 bg-muted rounded w-32 mb-2"></div>
                    <div className="h-4 bg-muted rounded w-24"></div>
                  </div>
                </div>
                <div className="space-y-3">
                  <div className="h-4 bg-muted rounded w-full"></div>
                  <div className="h-4 bg-muted rounded w-3/4"></div>
                  <div className="h-4 bg-muted rounded w-1/2"></div>
                </div>
              </div>
            </div>
            <div className="lg:col-span-2 space-y-6">
              <div className="bg-card border rounded-lg p-6">
                <div className="h-6 bg-muted rounded w-32 mb-4"></div>
                <div className="grid grid-cols-3 gap-4">
                  <div className="h-16 bg-muted rounded"></div>
                  <div className="h-16 bg-muted rounded"></div>
                  <div className="h-16 bg-muted rounded"></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!agent) {
    return (
      <div className="container mx-auto px-6 py-8">
        <div className="text-center py-12">
          <User className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">Agent not found</h3>
          <p className="text-muted-foreground mb-4">
            The agent you&apos;re looking for doesn&apos;t exist or has been deleted.
          </p>
          <Link href="/agents">
            <Button>Back to Agents</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-6 py-8">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <Link href="/agents">
          <Button variant="outline" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Agents
          </Button>
        </Link>
        <h1 className="text-2xl font-bold">Agent Details</h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Agent Profile */}
        <div className="lg:col-span-1 space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-4">
                  <Avatar className="h-16 w-16" style={{ backgroundColor: agent.color + '20' }}>
                    <AvatarImage src={agent.avatarUrl} />
                    <AvatarFallback
                      className="font-semibold text-white text-lg"
                      style={{ backgroundColor: agent.color }}
                    >
                      {getInitials(agent.name)}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <h2 className="text-xl font-semibold">{agent.name}</h2>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge className={getRoleColor(agent.role)}>{agent.role}</Badge>
                      <Badge className={getStatusColor(agent.status)}>{agent.status}</Badge>
                    </div>
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowEditDialog(true)}
                >
                  <Edit className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Calendar className="h-4 w-4" />
                  Joined {new Date(agent.createdAt).toLocaleDateString()}
                </div>
                
                {agent.currentTaskId && (
                  <div className="p-3 bg-muted/50 rounded-md">
                    <div className="flex items-center gap-2 text-sm">
                      <Briefcase className="h-4 w-4 text-muted-foreground" />
                      <span className="text-muted-foreground">Currently working on:</span>
                    </div>
                    <Link href={`/tasks/${agent.currentTaskId}`}>
                      <span className="font-medium text-primary hover:underline">
                        Task #{agent.currentTaskId}
                      </span>
                    </Link>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Statistics and Tasks */}
        <div className="lg:col-span-2 space-y-6">
          {/* Statistics */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5" />
                Task Statistics
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-6">
                <div className="text-center">
                  <div className="flex items-center justify-center gap-2 mb-2">
                    <Clock className="h-4 w-4 text-blue-500" />
                    <span className="text-2xl font-bold text-blue-600">
                      {agent.statistics.activeTasks}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground">Active Tasks</p>
                </div>
                
                <div className="text-center">
                  <div className="flex items-center justify-center gap-2 mb-2">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    <span className="text-2xl font-bold text-green-600">
                      {agent.statistics.completedTasks}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground">Completed</p>
                </div>
                
                <div className="text-center">
                  <div className="flex items-center justify-center gap-2 mb-2">
                    <User className="h-4 w-4 text-purple-500" />
                    <span className="text-2xl font-bold text-purple-600">
                      {agent.statistics.totalTasks}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground">Total Tasks</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Recent Tasks */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Briefcase className="h-5 w-5" />
                  Recent Tasks
                </div>
                <Link href={`/tasks?agent=${agent.name}`}>
                  <Button variant="outline" size="sm">
                    View All
                  </Button>
                </Link>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {agent.recentTasks.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Briefcase className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>No tasks assigned yet</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {agent.recentTasks.map((task) => (
                    <div key={task.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors">
                      <div className="flex-1">
                        <Link href={`/tasks/${task.id}`}>
                          <h4 className="font-medium hover:text-primary hover:underline">
                            {task.title}
                          </h4>
                        </Link>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge 
                            className={getStatusBadgeColor(task.status)}
                            variant="secondary"
                          >
                            {task.status}
                          </Badge>
                          <Badge 
                            className={getPriorityColor(task.priority)}
                            variant="secondary"
                          >
                            {task.priority}
                          </Badge>
                        </div>
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {new Date(task.updatedAt).toLocaleDateString()}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Edit Dialog */}
      <EditAgentDialog
        agent={agent}
        open={showEditDialog}
        onOpenChange={setShowEditDialog}
        onAgentUpdated={handleAgentUpdated}
      />
    </div>
  );
}