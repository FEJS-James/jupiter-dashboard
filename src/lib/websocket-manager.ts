/**
 * WebSocket Manager Stub
 * 
 * On Vercel (serverless), there's no persistent WebSocket server.
 * This stub provides the same interface but all emit calls are no-ops.
 * Real-time updates are handled via polling on the client side.
 */

class WebSocketManager {
  private static instance: WebSocketManager;

  private constructor() {}

  public static getInstance(): WebSocketManager {
    if (!WebSocketManager.instance) {
      WebSocketManager.instance = new WebSocketManager();
    }
    return WebSocketManager.instance;
  }

  public initialize(_io: unknown): void {
    // No-op in serverless mode
  }

  public getIO(): unknown {
    return null;
  }

  public isReady(): boolean {
    return false;
  }

  public emitTaskCreated(_task: unknown, _boardId?: string): void {
    // No-op — clients use polling
  }

  public emitTaskUpdated(_task: unknown, _boardId?: string): void {
    // No-op
  }

  public emitTaskDeleted(_taskId: number, _boardId?: string): void {
    // No-op
  }

  public emitTaskMoved(_taskId: number, _fromStatus: string, _toStatus: string, _task: unknown, _boardId?: string): void {
    // No-op
  }

  public emitCommentAdded(_taskId: number, _comment: unknown, _boardId?: string): void {
    // No-op
  }

  public emitBulkOperation(_operation: string, _taskIds: number[], _details: Record<string, unknown>, _boardId?: string): void {
    // No-op
  }

  public emitBulkTasksUpdated(_tasks: unknown[], _operation: string, _boardId?: string): void {
    // No-op
  }

  public emitCommentUpdated(_taskId: number, _commentId: number, _comment: unknown, _boardId?: string): void {
    // No-op
  }

  public emitCommentDeleted(_taskId: number, _commentId: number, _hardDelete: boolean, _boardId?: string): void {
    // No-op
  }

  public emitCommentReply(_parentCommentId: number, _reply: unknown, _boardId?: string): void {
    // No-op
  }

  public emitCommentReaction(_taskId: number, _commentId: number, _reaction: unknown, _action: 'added' | 'removed', _boardId?: string): void {
    // No-op
  }

  public emitUserPresence(_boardId: string, _users: unknown[]): void {
    // No-op
  }

  public getConnectedCount(): number {
    return 0;
  }

  public async getRoomClients(_room: string): Promise<Set<string>> {
    return new Set();
  }
}

export const websocketManager = WebSocketManager.getInstance();
export { WebSocketManager };
