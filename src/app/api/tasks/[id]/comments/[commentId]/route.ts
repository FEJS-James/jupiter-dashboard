import { NextRequest } from 'next/server';
import { eq, and, sql } from 'drizzle-orm';
import { db } from '@/lib/db';
import { tasks, agents, comments, commentHistory } from '@/lib/schema';
import { updateCommentSchema, deleteCommentSchema } from '@/lib/validation';
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

/**
 * GET /api/tasks/[id]/comments/[commentId] - Get a specific comment with details
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; commentId: string }> }
) {
  try {
    const { id, commentId } = await params;
    const taskId = extractIdFromParams({ id });
    const commentIdNum = extractIdFromParams({ id: commentId });
    
    // Get comment with full details
    const comment = await db
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
      .where(
        and(
          eq(comments.id, commentIdNum),
          eq(comments.taskId, taskId)
        )
      )
      .limit(1);
    
    if (comment.length === 0) {
      return createErrorResponse('Comment not found', 404);
    }
    
    // Get edit history if comment is edited
    let editHistory: any[] = [];
    if (comment[0].isEdited) {
      editHistory = await db
        .select({
          id: commentHistory.id,
          commentId: commentHistory.commentId,
          previousContent: commentHistory.previousContent,
          editReason: commentHistory.editReason,
          editedAt: commentHistory.editedAt,
          editedByAgent: {
            id: agents.id,
            name: agents.name,
            role: agents.role,
            color: agents.color,
          },
        })
        .from(commentHistory)
        .leftJoin(agents, eq(commentHistory.editedByAgentId, agents.id))
        .where(eq(commentHistory.commentId, commentIdNum))
        .orderBy(commentHistory.editedAt);
    }
    
    const commentWithDetails = {
      ...comment[0],
      mentions: comment[0].mentions || [],
      attachments: comment[0].attachments || [],
      metadata: comment[0].metadata || {},
      editHistory,
    };
    
    return createSuccessResponse(commentWithDetails);
    
  } catch (error: unknown) {
    if (error instanceof Error && error.message === 'Invalid ID parameter') {
      return createErrorResponse('Invalid comment or task ID', 400);
    }
    
    return handleDatabaseError(error);
  }
}

/**
 * PATCH /api/tasks/[id]/comments/[commentId] - Update a comment
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; commentId: string }> }
) {
  try {
    const { id, commentId } = await params;
    const taskId = extractIdFromParams({ id });
    const commentIdNum = extractIdFromParams({ id: commentId });
    const body = await parseRequestBody(request);
    const validatedData = updateCommentSchema.parse(body);
    
    // Get the existing comment
    const existingComment = await db
      .select({
        id: comments.id,
        agentId: comments.agentId,
        content: comments.content,
        contentType: comments.contentType,
        isDeleted: comments.isDeleted,
      })
      .from(comments)
      .where(
        and(
          eq(comments.id, commentIdNum),
          eq(comments.taskId, taskId)
        )
      )
      .limit(1);
    
    if (existingComment.length === 0) {
      return createErrorResponse('Comment not found', 404);
    }
    
    const comment = existingComment[0];
    
    // Check if comment is deleted
    if (comment.isDeleted) {
      return createErrorResponse('Cannot edit deleted comment', 403);
    }
    
    // For now, only allow the original author to edit (can be enhanced with permissions)
    // This would need authentication context to get current user
    // For demo purposes, we'll assume the agentId is passed in the body or headers
    const editorAgentId = body.editorAgentId || comment.agentId;
    
    // Verify editor agent exists
    const editorAgent = await db
      .select()
      .from(agents)
      .where(eq(agents.id, editorAgentId))
      .limit(1);
    
    if (editorAgent.length === 0) {
      return createErrorResponse('Editor agent not found', 400);
    }
    
    // Content validation
    if (validatedData.content.length > 10000) {
      return createErrorResponse('Comment content is too long', 400);
    }
    
    // Store edit history if content changed
    if (validatedData.content !== comment.content) {
      await db.insert(commentHistory).values({
        commentId: commentIdNum,
        previousContent: comment.content,
        editReason: validatedData.editReason,
        editedByAgentId: editorAgentId,
      });
    }
    
    // Update the comment
    const updateResult = await db
      .update(comments)
      .set({
        content: validatedData.content,
        contentType: validatedData.contentType || comment.contentType,
        mentions: validatedData.mentions ? JSON.stringify(validatedData.mentions) : null,
        attachments: validatedData.attachments ? JSON.stringify(validatedData.attachments) : null,
        metadata: validatedData.metadata ? JSON.stringify(validatedData.metadata) : null,
        isEdited: true,
        updatedAt: sql`(unixepoch())`,
      })
      .where(eq(comments.id, commentIdNum))
      .returning();
    
    const updatedComment = (updateResult as any[])[0];
    
    // Get updated comment with agent info
    const commentWithAgent = await db
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
      .where(eq(comments.id, commentIdNum))
      .limit(1);
    
    const responseData = {
      ...commentWithAgent[0],
      mentions: commentWithAgent[0].mentions || [],
      attachments: commentWithAgent[0].attachments || [],
      metadata: commentWithAgent[0].metadata || {},
    };
    
    // Emit real-time event for comment updated
    websocketManager.emitCommentUpdated(taskId, commentIdNum, responseData);
    
    return createSuccessResponse(responseData, 'Comment updated successfully');
    
  } catch (error: unknown) {
    if (error instanceof Error && error.message === 'Invalid ID parameter') {
      return createErrorResponse('Invalid comment or task ID', 400);
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

/**
 * DELETE /api/tasks/[id]/comments/[commentId] - Delete or soft-delete a comment
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; commentId: string }> }
) {
  try {
    const { id, commentId } = await params;
    const taskId = extractIdFromParams({ id });
    const commentIdNum = extractIdFromParams({ id: commentId });
    
    // Parse optional delete reason
    let deleteReason: string | undefined;
    try {
      const body = await parseRequestBody(request);
      const validatedData = deleteCommentSchema.parse(body);
      deleteReason = validatedData.reason;
    } catch {
      // No body is fine for DELETE
    }
    
    // Get the existing comment
    const existingComment = await db
      .select({
        id: comments.id,
        agentId: comments.agentId,
        parentId: comments.parentId,
        isDeleted: comments.isDeleted,
      })
      .from(comments)
      .where(
        and(
          eq(comments.id, commentIdNum),
          eq(comments.taskId, taskId)
        )
      )
      .limit(1);
    
    if (existingComment.length === 0) {
      return createErrorResponse('Comment not found', 404);
    }
    
    const comment = existingComment[0];
    
    if (comment.isDeleted) {
      return createErrorResponse('Comment is already deleted', 400);
    }
    
    // For now, assume deleter agent ID from body (would come from auth in real app)
    const deleterAgentId = (await parseRequestBody(request).catch(() => ({})))?.deleterAgentId || comment.agentId;
    
    // Check if comment has replies
    const repliesCount = await db
      .select({ count: comments.id })
      .from(comments)
      .where(
        and(
          eq(comments.parentId, commentIdNum),
          eq(comments.isDeleted, false)
        )
      );
    
    const hasReplies = repliesCount.length > 0;
    
    if (hasReplies) {
      // Soft delete - keep comment but mark as deleted
      const updateDeleteResult = await db
        .update(comments)
        .set({
          isDeleted: true,
          deletedAt: sql`(unixepoch())`,
          deletedByAgentId: deleterAgentId,
          content: '[This comment has been deleted]',
          metadata: JSON.stringify({ deleteReason }),
        })
        .where(eq(comments.id, commentIdNum))
        .returning();
      
      const updatedComment = (updateDeleteResult as any[])[0];
      
      websocketManager.emitCommentDeleted(taskId, commentIdNum, false); // soft delete
    } else {
      // Hard delete - completely remove comment if no replies
      await db
        .delete(comments)
        .where(eq(comments.id, commentIdNum));
      
      websocketManager.emitCommentDeleted(taskId, commentIdNum, true); // hard delete
    }
    
    return createSuccessResponse(
      { deleted: true, soft: hasReplies }, 
      hasReplies ? 'Comment marked as deleted' : 'Comment permanently deleted'
    );
    
  } catch (error: unknown) {
    if (error instanceof Error && error.message === 'Invalid ID parameter') {
      return createErrorResponse('Invalid comment or task ID', 400);
    }
    
    if (error instanceof ZodError) {
      return handleZodError(error);
    }
    
    return handleDatabaseError(error);
  }
}