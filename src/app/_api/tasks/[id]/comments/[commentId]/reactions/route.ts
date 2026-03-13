import { NextRequest } from 'next/server';
import { eq, and } from 'drizzle-orm';
import { db } from '@/lib/db';
import { comments, commentReactions, agents } from '@/lib/schema';
import { addCommentReactionSchema } from '@/lib/validation';
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
 * GET /api/tasks/[id]/comments/[commentId]/reactions - Get reactions for a comment
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; commentId: string }> }
) {
  try {
    const { id, commentId } = await params;
    const taskId = extractIdFromParams({ id });
    const commentIdNum = extractIdFromParams({ id: commentId });
    
    // Verify comment exists and belongs to the task
    const comment = await db
      .select({ id: comments.id })
      .from(comments)
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
    
    // Get all reactions for the comment
    const reactions = await db
      .select({
        id: commentReactions.id,
        commentId: commentReactions.commentId,
        reaction: commentReactions.reaction,
        timestamp: commentReactions.timestamp,
        agent: {
          id: agents.id,
          name: agents.name,
          role: agents.role,
          color: agents.color,
        },
      })
      .from(commentReactions)
      .leftJoin(agents, eq(commentReactions.agentId, agents.id))
      .where(eq(commentReactions.commentId, commentIdNum))
      .orderBy(commentReactions.timestamp);
    
    // Group reactions by type for summary
    const reactionSummary: Record<string, number> = {};
    reactions.forEach(reaction => {
      reactionSummary[reaction.reaction] = (reactionSummary[reaction.reaction] || 0) + 1;
    });
    
    return createSuccessResponse({
      reactions,
      summary: reactionSummary,
      total: reactions.length,
    });
    
  } catch (error: unknown) {
    if (error instanceof Error && error.message === 'Invalid ID parameter') {
      return createErrorResponse('Invalid comment or task ID', 400);
    }
    
    return handleDatabaseError(error);
  }
}

/**
 * POST /api/tasks/[id]/comments/[commentId]/reactions - Add a reaction to a comment
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; commentId: string }> }
) {
  try {
    const { id, commentId } = await params;
    const taskId = extractIdFromParams({ id });
    const commentIdNum = extractIdFromParams({ id: commentId });
    const body = await parseRequestBody(request);
    
    // Parse and validate reaction data
    const validatedData = addCommentReactionSchema.parse(body);
    
    // Get agent ID from body (would come from auth in real app)
    const agentId = body.agentId;
    if (!agentId) {
      return createErrorResponse('Agent ID is required', 400);
    }
    
    // Verify comment exists and belongs to the task
    const comment = await db
      .select({ id: comments.id })
      .from(comments)
      .where(
        and(
          eq(comments.id, commentIdNum),
          eq(comments.taskId, taskId),
          eq(comments.isDeleted, false)
        )
      )
      .limit(1);
    
    if (comment.length === 0) {
      return createErrorResponse('Comment not found or deleted', 404);
    }
    
    // Verify agent exists
    const agent = await db
      .select()
      .from(agents)
      .where(eq(agents.id, agentId))
      .limit(1);
    
    if (agent.length === 0) {
      return createErrorResponse('Agent not found', 400);
    }
    
    // Check if agent already has a reaction of this type on this comment
    const existingReaction = await db
      .select()
      .from(commentReactions)
      .where(
        and(
          eq(commentReactions.commentId, commentIdNum),
          eq(commentReactions.agentId, agentId),
          eq(commentReactions.reaction, validatedData.reaction)
        )
      )
      .limit(1);
    
    if (existingReaction.length > 0) {
      return createErrorResponse('You have already reacted with this reaction', 400);
    }
    
    // Add the reaction
    const reactionResult = await db
      .insert(commentReactions)
      .values({
        commentId: commentIdNum,
        agentId: agentId,
        reaction: validatedData.reaction,
      })
      .returning();
    
    const newReaction = (reactionResult as any[])[0];
    
    // Prepare response with agent info
    const reactionWithAgent = {
      ...newReaction,
      agent: {
        id: agent[0].id,
        name: agent[0].name,
        role: agent[0].role,
        color: agent[0].color,
      },
    };
    
    // Emit real-time event for new reaction
    websocketManager.emitCommentReaction(taskId, commentIdNum, reactionWithAgent, 'added');
    
    return createSuccessResponse(
      reactionWithAgent, 
      'Reaction added successfully', 
      201
    );
    
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
 * DELETE /api/tasks/[id]/comments/[commentId]/reactions - Remove a reaction from a comment
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; commentId: string }> }
) {
  try {
    const { id, commentId } = await params;
    const taskId = extractIdFromParams({ id });
    const commentIdNum = extractIdFromParams({ id: commentId });
    
    // Parse query parameters for reaction type and agent ID
    const url = new URL(request.url);
    const reaction = url.searchParams.get('reaction');
    const agentId = url.searchParams.get('agentId');
    
    if (!reaction || !agentId) {
      return createErrorResponse('Reaction type and agent ID are required', 400);
    }
    
    const agentIdNum = parseInt(agentId, 10);
    if (isNaN(agentIdNum)) {
      return createErrorResponse('Invalid agent ID', 400);
    }
    
    // Find and remove the reaction
    const existingReaction = await db
      .select()
      .from(commentReactions)
      .where(
        and(
          eq(commentReactions.commentId, commentIdNum),
          eq(commentReactions.agentId, agentIdNum),
          eq(commentReactions.reaction, reaction)
        )
      )
      .limit(1);
    
    if (existingReaction.length === 0) {
      return createErrorResponse('Reaction not found', 404);
    }
    
    await db
      .delete(commentReactions)
      .where(eq(commentReactions.id, existingReaction[0].id));
    
    // Emit real-time event for removed reaction
    websocketManager.emitCommentReaction(taskId, commentIdNum, existingReaction[0], 'removed');
    
    return createSuccessResponse(
      { removed: true }, 
      'Reaction removed successfully'
    );
    
  } catch (error: unknown) {
    if (error instanceof Error && error.message === 'Invalid ID parameter') {
      return createErrorResponse('Invalid comment or task ID', 400);
    }
    
    return handleDatabaseError(error);
  }
}