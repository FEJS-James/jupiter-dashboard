'use client';

import { useState } from 'react';
import { MoreHorizontal, Edit, Trash2, User, Activity, Clock } from 'lucide-react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { EditAgentDialog } from './edit-agent-dialog';
import { Agent, AgentRole, AgentStatus } from '@/types';
import { toast } from 'sonner';
import Link from 'next/link';

interface AgentWithCounts extends Agent {
  taskCounts: {
    total: number;
    active: number;
  };
}

interface AgentCardProps {
  agent: AgentWithCounts;
  onDelete: (agentId: number) => void;
  onUpdate: (agent: Agent) => void;
  getStatusColor: (status: AgentStatus) => string;
  getRoleColor: (role: AgentRole) => string;
}

export function AgentCard({
  agent,
  onDelete,
  onUpdate,
  getStatusColor,
  getRoleColor,
}: AgentCardProps) {
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const handleDelete = async () => {
    if (agent.taskCounts.active > 0) {
      toast.error(`Cannot delete ${agent.name} - they have ${agent.taskCounts.active} active task(s)`);
      return;
    }

    try {
      setDeleting(true);
      const response = await fetch(`/api/agents/${agent.id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to delete agent');
      }

      onDelete(agent.id);
      setShowDeleteDialog(false);
    } catch (error) {
      console.error('Error deleting agent:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to delete agent');
    } finally {
      setDeleting(false);
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const getWorkloadIndicator = (active: number, total: number) => {
    const percentage = total > 0 ? (active / total) * 100 : 0;
    if (percentage === 0) return 'text-muted-foreground';
    if (percentage < 30) return 'text-green-600';
    if (percentage < 70) return 'text-yellow-600';
    return 'text-red-600';
  };

  return (
    <>
      <Card className="group hover:shadow-lg transition-all duration-200 cursor-pointer">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <Link href={`/agents/${agent.id}`} className="flex items-center gap-3 flex-1">
              <Avatar className="h-12 w-12" style={{ backgroundColor: agent.color + '20' }}>
                <AvatarImage src={agent.avatarUrl} />
                <AvatarFallback
                  className="font-semibold text-white"
                  style={{ backgroundColor: agent.color }}
                >
                  {getInitials(agent.name)}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-lg leading-none mb-1 truncate">
                  {agent.name}
                </h3>
                <div className="flex items-center gap-2">
                  <Badge className={getRoleColor(agent.role)} variant="secondary">
                    {agent.role}
                  </Badge>
                  <Badge className={getStatusColor(agent.status)} variant="secondary">
                    {agent.status}
                  </Badge>
                </div>
              </div>
            </Link>
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="opacity-0 group-hover:opacity-100 transition-opacity">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => setShowEditDialog(true)}>
                  <Edit className="h-4 w-4 mr-2" />
                  Edit
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => setShowDeleteDialog(true)}
                  className="text-destructive focus:text-destructive"
                  disabled={agent.taskCounts.active > 0}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </CardHeader>

        <CardContent className="pt-0">
          <Link href={`/agents/${agent.id}`}>
            <div className="space-y-3">
              {/* Task Statistics */}
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="flex items-center gap-2">
                  <Activity className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Active:</span>
                  <span className={`font-semibold ${getWorkloadIndicator(agent.taskCounts.active, agent.taskCounts.total)}`}>
                    {agent.taskCounts.active}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Total:</span>
                  <span className="font-semibold">{agent.taskCounts.total}</span>
                </div>
              </div>

              {/* Current Task */}
              {agent.currentTaskId && (
                <div className="p-2 bg-muted/50 rounded-md">
                  <div className="flex items-center gap-2 text-sm">
                    <User className="h-3 w-3 text-muted-foreground" />
                    <span className="text-muted-foreground">Working on:</span>
                    <span className="font-medium">Task #{agent.currentTaskId}</span>
                  </div>
                </div>
              )}

              {/* Last Updated */}
              <div className="text-xs text-muted-foreground">
                Updated {new Date(agent.updatedAt).toLocaleDateString()}
              </div>
            </div>
          </Link>
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <EditAgentDialog
        agent={agent}
        open={showEditDialog}
        onOpenChange={setShowEditDialog}
        onAgentUpdated={onUpdate}
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Agent</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete <strong>{agent.name}</strong>? This action cannot be undone.
              {agent.taskCounts.active > 0 && (
                <div className="mt-2 p-2 bg-destructive/10 text-destructive rounded">
                  <strong>Warning:</strong> This agent has {agent.taskCounts.active} active task(s). 
                  Please reassign or complete these tasks before deleting.
                </div>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleting || agent.taskCounts.active > 0}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}