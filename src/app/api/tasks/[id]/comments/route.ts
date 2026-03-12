import { NextRequest } from 'next/server';
import { eq, and, isNull, desc, asc, inArray } from 'drizzle-orm';
import { db } from '@/lib/db';
import { tasks, agents, comments, commentHistory, commentNotifications } from '@/lib/schema';
import { 
  addCommentSchema, 
  updateCommentSchema, 
  deleteCommentSchema, 
  commentFiltersSchema 
} from '@/lib/validation';
import { ZodError } from 'zod';
import { 
  createErrorResponse, 
  createSuccessResponse, 
  handleZodError, 
  handleDatabaseError,
  parseRequestBody,
  extractIdFromParams
} from '@/lib/api-utils';
import { websocketManager } from '@/lib/websocket-manager';
import { ActivityLogger } from '@/lib/activity-logger';

/**
 * GET /api/tasks/[id]/comments - Get comments for a task with enhanced features
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const taskId = extractIdFromParams({ id });
    
    // Parse query parameters
    const url = new URL(request.url);
    const queryParams = Object.fromEntries(url.searchParams);
    const filters = commentFiltersSchema.parse(queryParams);
    
    // Check if task exists
    const existingTask = await db
      .select()
      .from(tasks)
      .where(eq(tasks.id, taskId))
      .limit(1);
    
    if (existingTask.length === 0) {
      return createErrorResponse('Task not found', 404);
    }
    
    // Build the query conditions
    const conditions = [eq(comments.taskId, taskId)];
    
    // Filter by parent ID for nested replies
    if (filters.parentId !== undefined) {
      conditions.push(eq(comments.parentId, filters.parentId));
    } else {
      // By default, only get top-level comments (no parent)
      conditions.push(isNull(comments.parentId));
    }
    
    // Include deleted comments only if requested
    if (!filters.includeDeleted) {
      conditions.push(eq(comments.isDeleted, false));
    }
    
    // Get comments with full relations
    const taskComments = await db
      .select({
        id: comments.id,
        taskId: comments.taskId,
        parentId: comments.parentId,
        content: comments.content,
        contentType: comments.contentType,
        isEdited: comments.isEdited,
        isDeleted: comments.isDeleted,
        deletedAt: comments.deletedAt,
        mentions: comments.mentions,
        attachments: comments.attachments,
        metadata: comments.metadata,
        timestamp: comments.timestamp,
        updatedAt: comments.updatedAt,
        agent: {
          id: agents.id,
          name: agents.name,
          role: agents.role,
          color: agents.color,
        },
      })
      .from(comments)
      .leftJoin(agents, eq(comments.agentId, agents.id))
      .where(and(...conditions))
      .orderBy(asc(comments.timestamp))
      .limit(filters.limit || 50)
      .offset(filters.offset || 0);
    
    // For each comment, get reply count if it's a top-level comment
    const commentsWithCounts = await Promise.all(
      taskComments.map(async (comment) => {
        let replyCount = 0;
        
        if (!comment.parentId) {
          // Count non-deleted replies
          const replyCountResult = await db
            .select({ count: comments.id })
            .from(comments)
            .where(
              and(
                eq(comments.parentId, comment.id),
                eq(comments.isDeleted, false)
              )
            );
          replyCount = replyCountResult.length;
        }
        
        return {
          ...comment,
          replyCount,
        };
      })
    );
    
    return createSuccessResponse(commentsWithCounts);
    
  } catch (error: unknown) {
    if (error instanceof Error && error.message === 'Invalid ID parameter') {
      return createErrorResponse('Invalid task ID', 400);
    }
    
    if (error instanceof ZodError) {
      return handleZodError(error);
    }
    
    return handleDatabaseError(error);
  }
}

/**
 * POST /api/tasks/[id]/comments - Add a new comment with enhanced features
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const taskId = extractIdFromParams({ id });
    const body = await parseRequestBody(request);
    const validatedData = addCommentSchema.parse(body);
    
    // Check if task exists
    const existingTask = await db
      .select()
      .from(tasks)
      .where(eq(tasks.id, taskId))
      .limit(1);
    
    if (existingTask.length === 0) {
      return createErrorResponse('Task not found', 404);
    }
    
    // Verify agent exists
    const agent = await db
      .select()
      .from(agents)
      .where(eq(agents.id, validatedData.agentId))
      .limit(1);
    
    if (agent.length === 0) {
      return createErrorResponse('Agent not found', 400);
    }
    
    // If this is a reply, verify parent comment exists
    if (validatedData.parentId) {
      const parentComment = await db
        .select()
        .from(comments)
        .where(
          and(
            eq(comments.id, validatedData.parentId),
            eq(comments.taskId, taskId),
            eq(comments.isDeleted, false)
          )
        )
        .limit(1);
      
      if (parentComment.length === 0) {
        return createErrorResponse('Parent comment not found or deleted', 400);
      }
    }
    
    // Validate mentioned agents exist
    if (validatedData.mentions && validatedData.mentions.length > 0) {
      const mentionedAgents = await db
        .select({ id: agents.id })
        .from(agents)
        .where(
          inArray(agents.id, validatedData.mentions)
        );
      
      if (mentionedAgents.length !== validatedData.mentions.length) {
        return createErrorResponse('Some mentioned agents do not exist', 400);
      }
    }
    
    // Enhanced spam detection and content validation
    const contentLength = validatedData.content.length;
    
    // Strict length check (redundant with Zod but explicit)
    if (contentLength > 10000) {
      return createErrorResponse('Comment content exceeds maximum length of 10,000 characters', 400);
    }
    
    // Enhanced spam detection
    const spamPatterns = [
      /(.)\1{9,}/g, // Excessive repeated characters (10+ total: 1 + 9 repeats) 
      /(https?:\/\/[^\s]+){5,}/g, // Multiple URLs (5+)
      /(.{1,10})\1{5,}/g, // Repeated short patterns (5+ times)
      /[^\w\s]{10,}/g, // Excessive special characters
      /^(.)\1*$/, // Content that is entirely one character repeated
    ];
    
    const hasSpam = spamPatterns.some(pattern => {
      const matches = pattern.test(validatedData.content);
      console.log(`Spam pattern ${pattern} matches: ${matches}`);
      return matches;
    });
    
    console.log(`Spam detection result: ${hasSpam} for content: ${validatedData.content.substring(0, 50)}...`);
    
    if (hasSpam) {
      return createErrorResponse('Comment appears to be spam and violates content policies', 400);
    }
    
    // Additional content quality checks
    const excessiveNewlines = (validatedData.content.match(/\n/g) || []).length;
    if (excessiveNewlines > 100) {
      return createErrorResponse('Comment contains excessive line breaks', 400);
    }
    
    // Check for excessive repetition of words
    const words = validatedData.content.toLowerCase().split(/\s+/);
    const wordCounts = new Map<string, number>();
    for (const word of words) {
      if (word.length > 3) { // Only check meaningful words
        wordCounts.set(word, (wordCounts.get(word) || 0) + 1);
      }
    }
    
    // Flag if any single word appears more than 20% of total words (likely spam)
    const totalWords = words.length;
    for (const [word, count] of wordCounts) {
      if (count > totalWords * 0.2 && count > 10) {
        return createErrorResponse('Comment appears to contain excessive repetition', 400);
      }
    }
    
    // Create the comment
    const insertResult = await db
      .insert(comments)
      .values({
        taskId,
        agentId: validatedData.agentId,
        parentId: validatedData.parentId || null,
        content: validatedData.content,
        contentType: validatedData.contentType || 'plain',
        mentions: validatedData.mentions ? JSON.stringify(validatedData.mentions) : null,
        attachments: validatedData.attachments ? JSON.stringify(validatedData.attachments) : null,
        metadata: validatedData.metadata ? JSON.stringify(validatedData.metadata) : null,
      })
      .returning();
    
    const newComment = (insertResult as any[])[0];
    
    // Log activity for comment creation
    await ActivityLogger.logCommentAdded(
      taskId,
      existingTask[0].projectId,
      newComment.id,
      validatedData.agentId,
      {
        contentType: validatedData.contentType,
        isReply: !!validatedData.parentId,
        hasMentions: !!(validatedData.mentions && validatedData.mentions.length > 0),
        hasAttachments: !!(validatedData.attachments && validatedData.attachments.length > 0),
      }
    );
    
    // Create notifications for mentions
    if (validatedData.mentions && validatedData.mentions.length > 0) {
      const notificationInserts = validatedData.mentions
        .filter(mentionId => mentionId !== validatedData.agentId) // Don't notify yourself
        .map(mentionId => ({
          recipientAgentId: mentionId,
          commentId: newComment.id,
          taskId: taskId,
          type: 'mention' as const,
        }));
      
      if (notificationInserts.length > 0) {
        await db.insert(commentNotifications).values(notificationInserts);
      }
    }
    
    // Create notification for parent comment author (if replying)
    if (validatedData.parentId) {
      const parentComment = await db
        .select({ agentId: comments.agentId })
        .from(comments)
        .where(eq(comments.id, validatedData.parentId))
        .limit(1);
      
      if (parentComment.length > 0 && parentComment[0].agentId !== validatedData.agentId) {
        await db.insert(commentNotifications).values({
          recipientAgentId: parentComment[0].agentId,
          commentId: newComment.id,
          taskId: taskId,
          type: 'reply',
        });
      }
    }
    
    // Prepare response data with agent info
    const commentWithAgent = {
      ...newComment,
      agent: {
        id: agent[0].id,
        name: agent[0].name,
        role: agent[0].role,
        color: agent[0].color,
      },
      mentions: validatedData.mentions || [],
      attachments: validatedData.attachments || [],
      metadata: validatedData.metadata || {},
      replyCount: 0,
    };
    
    // Emit real-time event for comment added
    websocketManager.emitCommentAdded(taskId, commentWithAgent);
    
    // If this is a reply, also emit a reply event
    if (validatedData.parentId) {
      websocketManager.emitCommentReply(validatedData.parentId, commentWithAgent);
    }
    
    return createSuccessResponse(
      commentWithAgent, 
      'Comment added successfully', 
      201
    );
    
  } catch (error: unknown) {
    if (error instanceof Error && error.message === 'Invalid ID parameter') {
      return createErrorResponse('Invalid task ID', 400);
    }
    
    if (error instanceof ZodError) {
      return handleZodError(error);
    }
    
    if (error instanceof Error && error.message === 'Invalid JSON in request body') {
      return createErrorResponse('Invalid JSON in request body', 400);
    }
    
    return handleDatabaseError(error);
  }
}