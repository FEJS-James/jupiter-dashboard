import { NextRequest } from 'next/server';
import { eq, and, desc, sql } from 'drizzle-orm';
import { db } from '@/lib/db';
import { agents, commentNotifications, comments, tasks } from '@/lib/schema';
import { ZodError } from 'zod';
import { 
  createErrorResponse, 
  createSuccessResponse, 
  handleZodError, 
  handleDatabaseError,
  extractIdFromParams
} from '@/lib/api-utils';
import { requireAuth, validateUserAccess, forbiddenResponse } from '@/lib/auth';
import { z } from 'zod';

// Patch request schema
const PatchNotificationsSchema = z.object({
  notificationIds: z.array(z.number().positive()).optional(),
  markAll: z.boolean().optional(),
})

/**
 * GET /api/agents/[id]/notifications - Get notifications for an agent
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  // Require authentication
  const { session, error } = requireAuth(request)
  if (error) return error

  try {
    const { id } = await params;
    const agentId = extractIdFromParams({ id });

    // Ensure user can only access their own agent notifications
    if (!validateUserAccess(session, agentId)) {
      return forbiddenResponse('You can only access your own notifications')
    }
    
    // Parse query parameters
    const url = new URL(request.url);
    const unreadOnly = url.searchParams.get('unreadOnly') === 'true';
    const limit = parseInt(url.searchParams.get('limit') || '50', 10);
    const offset = parseInt(url.searchParams.get('offset') || '0', 10);
    
    // Verify agent exists
    const agent = await db
      .select()
      .from(agents)
      .where(eq(agents.id, agentId))
      .limit(1);
    
    if (agent.length === 0) {
      return createErrorResponse('Agent not found', 404);
    }
    
    // Build conditions
    const conditions = [eq(commentNotifications.recipientAgentId, agentId)];
    if (unreadOnly) {
      conditions.push(eq(commentNotifications.isRead, false));
    }
    
    // Get notifications with related data
    const notifications = await db
      .select({
        id: commentNotifications.id,
        recipientAgentId: commentNotifications.recipientAgentId,
        commentId: commentNotifications.commentId,
        taskId: commentNotifications.taskId,
        type: commentNotifications.type,
        isRead: commentNotifications.isRead,
        readAt: commentNotifications.readAt,
        createdAt: commentNotifications.createdAt,
      })
      .from(commentNotifications)
      .where(and(...conditions))
      .orderBy(desc(commentNotifications.createdAt))
      .limit(limit)
      .offset(offset);
    
    // Fetch related data separately to avoid complex joins
    const enrichedNotifications = await Promise.all(
      notifications.map(async (notification) => {
        let comment = null;
        let task = null;
        
        if (notification.commentId) {
          const commentResult = await db
            .select({
              id: comments.id,
              content: comments.content,
              timestamp: comments.timestamp,
              agentId: comments.agentId,
            })
            .from(comments)
            .where(eq(comments.id, notification.commentId))
            .limit(1);
          
          if (commentResult.length > 0) {
            const commentData = commentResult[0];
            
            // Get comment author
            const agentResult = await db
              .select()
              .from(agents)
              .where(eq(agents.id, commentData.agentId))
              .limit(1);
            
            comment = {
              id: commentData.id,
              content: commentData.content,
              timestamp: commentData.timestamp,
              agent: agentResult[0] ? {
                id: agentResult[0].id,
                name: agentResult[0].name,
                role: agentResult[0].role,
                color: agentResult[0].color,
              } : null,
            };
          }
        }
        
        if (notification.taskId) {
          const taskResult = await db
            .select({
              id: tasks.id,
              title: tasks.title,
            })
            .from(tasks)
            .where(eq(tasks.id, notification.taskId))
            .limit(1);
          
          if (taskResult.length > 0) {
            task = taskResult[0];
          }
        }
        
        return {
          ...notification,
          comment,
          task,
        };
      })
    );
    
    // Get unread count
    const unreadCountResult = await db
      .select({ count: commentNotifications.id })
      .from(commentNotifications)
      .where(
        and(
          eq(commentNotifications.recipientAgentId, agentId),
          eq(commentNotifications.isRead, false)
        )
      );
    
    const unreadCount = unreadCountResult.length;
    
    return createSuccessResponse({
      notifications: enrichedNotifications,
      unreadCount,
      total: enrichedNotifications.length,
    });
    
  } catch (error: unknown) {
    if (error instanceof Error && error.message === 'Invalid ID parameter') {
      return createErrorResponse('Invalid agent ID', 400);
    }
    
    return handleDatabaseError(error);
  }
}

/**
 * PATCH /api/agents/[id]/notifications - Mark notifications as read
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  // Require authentication
  const { session, error } = requireAuth(request)
  if (error) return error

  try {
    const { id } = await params;
    const agentId = extractIdFromParams({ id });

    // Ensure user can only update their own notifications
    if (!validateUserAccess(session, agentId)) {
      return forbiddenResponse('You can only update your own notifications')
    }
    
    const body = await request.json();
    
    // Validate input
    const validation = PatchNotificationsSchema.safeParse(body)
    if (!validation.success) {
      return createErrorResponse('Invalid input data', 400)
    }

    const { notificationIds, markAll } = validation.data;
    
    // Verify agent exists
    const agent = await db
      .select()
      .from(agents)
      .where(eq(agents.id, agentId))
      .limit(1);
    
    if (agent.length === 0) {
      return createErrorResponse('Agent not found', 404);
    }
    
    if (markAll) {
      // Mark all unread notifications as read
      await db
        .update(commentNotifications)
        .set({
          isRead: true,
          readAt: sql`(unixepoch())`,
        })
        .where(
          and(
            eq(commentNotifications.recipientAgentId, agentId),
            eq(commentNotifications.isRead, false)
          )
        );
      
      return createSuccessResponse(
        { markedAsRead: 'all' },
        'All notifications marked as read'
      );
    } else if (notificationIds && Array.isArray(notificationIds)) {
      // Mark specific notifications as read
      await Promise.all(
        notificationIds.map((notificationId: number) =>
          db
            .update(commentNotifications)
            .set({
              isRead: true,
              readAt: sql`(unixepoch())`,
            })
            .where(
              and(
                eq(commentNotifications.id, notificationId),
                eq(commentNotifications.recipientAgentId, agentId)
              )
            )
        )
      );
      
      return createSuccessResponse(
        { markedAsRead: notificationIds.length },
        `${notificationIds.length} notifications marked as read`
      );
    } else {
      return createErrorResponse('Invalid request: provide notificationIds or set markAll to true', 400);
    }
    
  } catch (error: unknown) {
    if (error instanceof Error && error.message === 'Invalid ID parameter') {
      return createErrorResponse('Invalid agent ID', 400);
    }
    
    if (error instanceof Error && error.message.includes('JSON')) {
      return createErrorResponse('Invalid JSON in request body', 400);
    }
    
    return handleDatabaseError(error);
  }
}