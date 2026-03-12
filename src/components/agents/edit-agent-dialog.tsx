'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Agent, AgentRole, AgentStatus } from '@/types';
import { toast } from 'sonner';

const updateAgentSchema = z.object({
  name: z.string().min(1).max(50).optional(),
  role: z.enum(['coder', 'reviewer', 'devops', 'manager', 'tester']).optional(),
  color: z.string().regex(/^#[0-9A-F]{6}$/i, 'Color must be a valid hex color').optional(),
  avatarUrl: z.string().url().optional().or(z.literal('')),
  status: z.enum(['available', 'busy', 'offline']).optional(),
  currentTaskId: z.number().int().positive().optional().or(z.null()),
});

type UpdateAgentFormData = z.infer<typeof updateAgentSchema>;

interface EditAgentDialogProps {
  agent: Agent;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAgentUpdated: (agent: Agent) => void;
}

const roleOptions: { value: AgentRole; label: string; description: string }[] = [
  { value: 'coder', label: 'Coder', description: 'Develops and implements features' },
  { value: 'reviewer', label: 'Reviewer', description: 'Reviews code and ensures quality' },
  { value: 'tester', label: 'Tester', description: 'Tests features and reports bugs' },
  { value: 'devops', label: 'DevOps', description: 'Handles deployment and infrastructure' },
  { value: 'manager', label: 'Manager', description: 'Manages projects and coordinates work' },
];

const colorOptions = [
  { value: '#3b82f6', label: 'Blue' },
  { value: '#10b981', label: 'Green' },
  { value: '#f59e0b', label: 'Yellow' },
  { value: '#ef4444', label: 'Red' },
  { value: '#8b5cf6', label: 'Purple' },
  { value: '#06b6d4', label: 'Cyan' },
  { value: '#f97316', label: 'Orange' },
  { value: '#84cc16', label: 'Lime' },
];

export function EditAgentDialog({
  agent,
  open,
  onOpenChange,
  onAgentUpdated,
}: EditAgentDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<UpdateAgentFormData>({
    resolver: zodResolver(updateAgentSchema),
    defaultValues: {
      name: agent.name,
      role: agent.role,
      color: agent.color,
      avatarUrl: agent.avatarUrl || '',
      status: agent.status,
      currentTaskId: agent.currentTaskId || null,
    },
  });

  // Reset form when agent changes or dialog opens
  useState(() => {
    if (open) {
      form.reset({
        name: agent.name,
        role: agent.role,
        color: agent.color,
        avatarUrl: agent.avatarUrl || '',
        status: agent.status,
        currentTaskId: agent.currentTaskId || null,
      });
    }
  });

  const handleSubmit = async (data: UpdateAgentFormData) => {
    try {
      setIsSubmitting(true);

      // Only send fields that have changed
      const updatedFields: Partial<UpdateAgentFormData> = {};
      
      if (data.name !== agent.name) updatedFields.name = data.name;
      if (data.role !== agent.role) updatedFields.role = data.role;
      if (data.color !== agent.color) updatedFields.color = data.color;
      if (data.avatarUrl !== (agent.avatarUrl || '')) updatedFields.avatarUrl = data.avatarUrl;
      if (data.status !== agent.status) updatedFields.status = data.status;
      if (data.currentTaskId !== agent.currentTaskId) updatedFields.currentTaskId = data.currentTaskId;

      if (Object.keys(updatedFields).length === 0) {
        toast.info('No changes made');
        onOpenChange(false);
        return;
      }

      const response = await fetch(`/api/agents/${agent.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updatedFields),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to update agent');
      }

      const result = await response.json();
      onAgentUpdated(result.data);
      onOpenChange(false);
    } catch (error) {
      console.error('Error updating agent:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to update agent');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!isSubmitting) {
      onOpenChange(newOpen);
      if (!newOpen) {
        form.reset();
      }
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Edit Agent</DialogTitle>
          <DialogDescription>
            Update the agent&apos;s information, role, or status.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Agent Name</FormLabel>
                  <FormControl>
                    <Input placeholder="Enter agent name" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="role"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Role</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a role" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {roleOptions.map((role) => (
                        <SelectItem key={role.value} value={role.value}>
                          <div>
                            <div className="font-medium">{role.label}</div>
                            <div className="text-sm text-muted-foreground">{role.description}</div>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="color"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Color</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a color" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {colorOptions.map((color) => (
                        <SelectItem key={color.value} value={color.value}>
                          <div className="flex items-center gap-2">
                            <div
                              className="w-4 h-4 rounded-full border"
                              style={{ backgroundColor: color.value }}
                            />
                            {color.label}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="status"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Status</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select status" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="available">
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full bg-green-500" />
                          Available
                        </div>
                      </SelectItem>
                      <SelectItem value="busy">
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full bg-yellow-500" />
                          Busy
                        </div>
                      </SelectItem>
                      <SelectItem value="offline">
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full bg-gray-500" />
                          Offline
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="avatarUrl"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Avatar URL (Optional)</FormLabel>
                  <FormControl>
                    <Input placeholder="https://example.com/avatar.jpg" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => handleOpenChange(false)}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'Updating...' : 'Update Agent'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}