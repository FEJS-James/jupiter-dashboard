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