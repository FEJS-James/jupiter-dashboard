import { Server } from 'socket.io';
import { randomUUID } from 'crypto';

/**
 * Global reference for Socket.IO instance
 * This works across different execution contexts in Next.js
 */
declare global {
  var __socketIO: Server | undefined;
}

/**
 * Singleton WebSocket Manager
 * 
 * Provides a shared Socket.IO instance accessible from API routes
 * so they can emit real-time events when database operations occur.
 */
class WebSocketManager {
  private static instance: WebSocketManager;

  private constructor() {}

  /**
   * Get singleton instance
   */
  public static getInstance(): WebSocketManager {
    if (!WebSocketManager.instance) {
      WebSocketManager.instance = new WebSocketManager();
    }
    return WebSocketManager.instance;
  }

  /**
   * Initialize the Socket.IO instance (called from server.ts)
   */
  public initialize(io: Server): void {
    global.__socketIO = io;
    console.log('WebSocket manager initialized and stored in global scope');
  }

  /**
   * Get the Socket.IO instance
   */
  public getIO(): Server | null {
    return global.__socketIO || null;
  }

  /**
   * Check if WebSocket is available
   */
  public isReady(): boolean {
    return global.__socketIO !== undefined;
  }

  /**
   * Emit a task created event to all connected clients
   */
  public emitTaskCreated(task: any, boardId?: string): void {
    if (!global.__socketIO) {
      console.warn('WebSocket not initialized - cannot emit taskCreated event');
      return;
    }

    try {
      const targetRoom = boardId || 'board-1'; // Default to board-1 for testing
      global.__socketIO.to(targetRoom).emit('taskCreated', task);

      // Also emit activity
      const activity = {
        id: randomUUID(),
        type: 'task_created',
        taskId: task.id,
        taskTitle: task.title,
        timestamp: new Date(),
        data: task
      };
      global.__socketIO.to(targetRoom).emit('activity', activity);

      console.log(`Emitted taskCreated event for task ${task.id} to room ${targetRoom}`);
    } catch (error) {
      console.error('Error emitting taskCreated event:', error);
    }
  }

  /**
   * Emit a task updated event to all connected clients
   */
  public emitTaskUpdated(task: any, boardId?: string): void {
    if (!global.__socketIO) {
      console.warn('WebSocket not initialized - cannot emit taskUpdated event');
      return;
    }

    try {
      const targetRoom = boardId || 'board-1'; // Default to board-1 for testing
      global.__socketIO.to(targetRoom).emit('taskUpdated', task);

      // Also emit activity
      const activity = {
        id: randomUUID(),
        type: 'task_updated',
        taskId: task.id,
        taskTitle: task.title,
        timestamp: new Date(),
        data: task
      };
      global.__socketIO.to(targetRoom).emit('activity', activity);

      console.log(`Emitted taskUpdated event for task ${task.id} to room ${targetRoom}`);
    } catch (error) {
      console.error('Error emitting taskUpdated event:', error);
    }
  }

  /**
   * Emit a task deleted event to all connected clients
   */
  public emitTaskDeleted(taskId: number, boardId?: string): void {
    if (!global.__socketIO) {
      console.warn('WebSocket not initialized - cannot emit taskDeleted event');
      return;
    }

    try {
      const targetRoom = boardId || 'board-1'; // Default to board-1 for testing
      global.__socketIO.to(targetRoom).emit('taskDeleted', taskId);

      // Also emit activity
      const activity = {
        id: randomUUID(),
        type: 'task_deleted',
        taskId: taskId,
        timestamp: new Date()
      };
      global.__socketIO.to(targetRoom).emit('activity', activity);

      console.log(`Emitted taskDeleted event for task ${taskId} to room ${targetRoom}`);
    } catch (error) {
      console.error('Error emitting taskDeleted event:', error);
    }
  }

  /**
   * Emit a task moved event to all connected clients
   */
  public emitTaskMoved(taskId: number, fromStatus: string, toStatus: string, task: any, boardId?: string): void {
    if (!global.__socketIO) {
      console.warn('WebSocket not initialized - cannot emit taskMoved event');
      return;
    }

    try {
      const targetRoom = boardId || 'board-1'; // Default to board-1 for testing
      global.__socketIO.to(targetRoom).emit('taskMoved', taskId, fromStatus, toStatus, task);

      // Also emit activity
      const activity = {
        id: randomUUID(),
        type: 'task_moved',
        taskId: taskId,
        fromStatus: fromStatus,
        toStatus: toStatus,
        timestamp: new Date(),
        data: task
      };
      global.__socketIO.to(targetRoom).emit('activity', activity);

      console.log(`Emitted taskMoved event for task ${taskId} from ${fromStatus} to ${toStatus} to room ${targetRoom}`);
    } catch (error) {
      console.error('Error emitting taskMoved event:', error);
    }
  }

  /**
   * Emit a comment added event to all connected clients
   */
  public emitCommentAdded(taskId: number, comment: any, boardId?: string): void {
    if (!global.__socketIO) {
      console.warn('WebSocket not initialized - cannot emit commentAdded event');
      return;
    }

    try {
      const targetRoom = boardId || 'board-1'; // Default to board-1 for testing
      global.__socketIO.to(targetRoom).emit('commentAdded', taskId, comment);

      // Also emit activity
      const activity = {
        id: randomUUID(),
        type: 'comment_added',
        taskId: taskId,
        commentId: comment.id,
        content: comment.content.substring(0, 100) + (comment.content.length > 100 ? '...' : ''),
        timestamp: new Date(),
        data: comment
      };
      global.__socketIO.to(targetRoom).emit('activity', activity);

      console.log(`Emitted commentAdded event for task ${taskId} to room ${targetRoom}`);
    } catch (error) {
      console.error('Error emitting commentAdded event:', error);
    }
  }

  /**
   * Emit a bulk operation event to all connected clients
   */
  public emitBulkOperation(
    operation: string,
    taskIds: number[],
    details: Record<string, unknown>,
    boardId?: string
  ): void {
    if (!global.__socketIO) {
      console.warn('WebSocket not initialized - cannot emit bulkOperation event');
      return;
    }

    try {
      const targetRoom = boardId || 'board-1';
      global.__socketIO.to(targetRoom).emit('bulkOperation', {
        operation,
        taskIds,
        details,
        timestamp: new Date(),
      });

      // Also emit activity
      const activity = {
        id: randomUUID(),
        type: 'bulk_operation',
        operation,
        taskCount: taskIds.length,
        taskIds,
        details,
        timestamp: new Date(),
      };
      global.__socketIO.to(targetRoom).emit('activity', activity);

      console.log(`Emitted bulkOperation (${operation}) event for ${taskIds.length} tasks to room ${targetRoom}`);
    } catch (error) {
      console.error(`Error emitting bulkOperation (${operation}) event:`, error);
    }
  }

  /**
   * Emit multiple tasks updated for bulk operations
   */
  public emitBulkTasksUpdated(tasks: any[], operation: string, boardId?: string): void {
    if (!global.__socketIO) {
      console.warn('WebSocket not initialized - cannot emit bulkTasksUpdated event');
      return;
    }

    try {
      const targetRoom = boardId || 'board-1';
      global.__socketIO.to(targetRoom).emit('bulkTasksUpdated', {
        tasks,
        operation,
        timestamp: new Date(),
      });

      console.log(`Emitted bulkTasksUpdated event for ${tasks.length} tasks (${operation}) to room ${targetRoom}`);
    } catch (error) {
      console.error(`Error emitting bulkTasksUpdated event:`, error);
    }
  }

  /**
   * Emit a comment updated event to all connected clients
   */
  public emitCommentUpdated(taskId: number, commentId: number, comment: any, boardId?: string): void {
    if (!global.__socketIO) {
      console.warn('WebSocket not initialized - cannot emit commentUpdated event');
      return;
    }

    try {
      const targetRoom = boardId || 'board-1';
      global.__socketIO.to(targetRoom).emit('commentUpdated', taskId, commentId, comment);

      // Also emit activity
      const activity = {
        id: randomUUID(),
        type: 'comment_updated',
        taskId: taskId,
        commentId: commentId,
        content: comment.content.substring(0, 100) + (comment.content.length > 100 ? '...' : ''),
        timestamp: new Date(),
        data: comment
      };
      global.__socketIO.to(targetRoom).emit('activity', activity);

      console.log(`Emitted commentUpdated event for comment ${commentId} in task ${taskId} to room ${targetRoom}`);
    } catch (error) {
      console.error('Error emitting commentUpdated event:', error);
    }
  }

  /**
   * Emit a comment deleted event to all connected clients
   */
  public emitCommentDeleted(taskId: number, commentId: number, hardDelete: boolean, boardId?: string): void {
    if (!global.__socketIO) {
      console.warn('WebSocket not initialized - cannot emit commentDeleted event');
      return;
    }

    try {
      const targetRoom = boardId || 'board-1';
      global.__socketIO.to(targetRoom).emit('commentDeleted', taskId, commentId, hardDelete);

      // Also emit activity
      const activity = {
        id: randomUUID(),
        type: 'comment_deleted',
        taskId: taskId,
        commentId: commentId,
        timestamp: new Date(),
        data: { hardDelete }
      };
      global.__socketIO.to(targetRoom).emit('activity', activity);

      console.log(`Emitted commentDeleted event for comment ${commentId} in task ${taskId} to room ${targetRoom}`);
    } catch (error) {
      console.error('Error emitting commentDeleted event:', error);
    }
  }

  /**
   * Emit a comment reply event to all connected clients
   */
  public emitCommentReply(parentCommentId: number, reply: any, boardId?: string): void {
    if (!global.__socketIO) {
      console.warn('WebSocket not initialized - cannot emit commentReply event');
      return;
    }

    try {
      const targetRoom = boardId || 'board-1';
      global.__socketIO.to(targetRoom).emit('commentReply', parentCommentId, reply);

      console.log(`Emitted commentReply event for parent comment ${parentCommentId} to room ${targetRoom}`);
    } catch (error) {
      console.error('Error emitting commentReply event:', error);
    }
  }

  /**
   * Emit a comment reaction event to all connected clients
   */
  public emitCommentReaction(taskId: number, commentId: number, reaction: any, action: 'added' | 'removed', boardId?: string): void {
    if (!global.__socketIO) {
      console.warn('WebSocket not initialized - cannot emit commentReaction event');
      return;
    }

    try {
      const targetRoom = boardId || 'board-1';
      global.__socketIO.to(targetRoom).emit('commentReaction', taskId, commentId, reaction, action);

      console.log(`Emitted commentReaction event (${action}) for comment ${commentId} in task ${taskId} to room ${targetRoom}`);
    } catch (error) {
      console.error('Error emitting commentReaction event:', error);
    }
  }

  /**
   * Emit a user presence update
   */
  public emitUserPresence(boardId: string, users: any[]): void {
    if (!global.__socketIO) {
      console.warn('WebSocket not initialized - cannot emit userPresence event');
      return;
    }

    try {
      global.__socketIO.to(boardId).emit('userPresence', users);
      console.log(`Emitted userPresence event to board ${boardId} with ${users.length} users`);
    } catch (error) {
      console.error('Error emitting userPresence event:', error);
    }
  }

  /**
   * Get connected clients count
   */
  public getConnectedCount(): number {
    if (!global.__socketIO) {
      return 0;
    }
    return global.__socketIO.sockets.sockets.size;
  }

  /**
   * Get connected clients for a specific room
   */
  public async getRoomClients(room: string): Promise<Set<string>> {
    if (!global.__socketIO) {
      return new Set();
    }
    return global.__socketIO.sockets.adapter.rooms.get(room) || new Set();
  }
}

export const websocketManager = WebSocketManager.getInstance();

// Export the class as well for debugging
export { WebSocketManager };