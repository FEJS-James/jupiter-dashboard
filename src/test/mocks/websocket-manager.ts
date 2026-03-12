/**
 * Mock WebSocket Manager for testing
 * 
 * This replaces the real WebSocket manager during tests to avoid 
 * initialization issues and provide predictable behavior.
 */
export class MockWebSocketManager {
  private static instance: MockWebSocketManager;
  private io: any = null;

  private constructor() {}

  public static getInstance(): MockWebSocketManager {
    if (!MockWebSocketManager.instance) {
      MockWebSocketManager.instance = new MockWebSocketManager();
    }
    return MockWebSocketManager.instance;
  }

  public initialize(io: any): void {
    this.io = io;
    console.log('Mock WebSocket manager initialized');
  }

  public getIO(): any {
    return this.io;
  }

  public isReady(): boolean {
    return true; // Always ready in tests
  }

  // Mock methods that don't actually emit anything in tests
  public emitTaskCreated(task: any, boardId?: string): void {
    console.log(`Mock: emitTaskCreated for task ${task.id}`);
  }

  public emitTaskUpdated(task: any, boardId?: string): void {
    console.log(`Mock: emitTaskUpdated for task ${task.id}`);
  }

  public emitTaskDeleted(taskId: number, boardId?: string): void {
    console.log(`Mock: emitTaskDeleted for task ${taskId}`);
  }

  public emitTaskMoved(taskId: number, fromStatus: string, toStatus: string, task: any, boardId?: string): void {
    console.log(`Mock: emitTaskMoved for task ${taskId} from ${fromStatus} to ${toStatus}`);
  }

  public emitCommentAdded(taskId: number, comment: any, boardId?: string): void {
    console.log(`Mock: emitCommentAdded for task ${taskId}`);
  }

  public emitCommentUpdated(taskId: number, commentId: number, comment: any, boardId?: string): void {
    console.log(`Mock: emitCommentUpdated for comment ${commentId} in task ${taskId}`);
  }

  public emitCommentDeleted(taskId: number, commentId: number, hardDelete: boolean, boardId?: string): void {
    console.log(`Mock: emitCommentDeleted for comment ${commentId} in task ${taskId}`);
  }

  public emitCommentReply(parentCommentId: number, reply: any, boardId?: string): void {
    console.log(`Mock: emitCommentReply for parent comment ${parentCommentId}`);
  }

  public emitCommentReaction(taskId: number, commentId: number, reaction: any, action: 'added' | 'removed', boardId?: string): void {
    console.log(`Mock: emitCommentReaction (${action}) for comment ${commentId} in task ${taskId}`);
  }

  public emitUserPresence(boardId: string, users: any[]): void {
    console.log(`Mock: emitUserPresence to board ${boardId} with ${users.length} users`);
  }

  public getConnectedCount(): number {
    return 0; // No real connections in tests
  }

  public async getRoomClients(room: string): Promise<Set<string>> {
    return new Set(); // No real clients in tests
  }
}

export const mockWebsocketManager = MockWebSocketManager.getInstance();