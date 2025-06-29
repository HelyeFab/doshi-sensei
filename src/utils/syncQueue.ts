// Sync Queue Manager for offline support and error recovery
export interface SyncOperation {
  id: string;
  type: 'upload' | 'download' | 'delete';
  collection: string;
  documentId: string;
  data?: any;
  userId: string;
  timestamp: number;
  retryCount: number;
  maxRetries: number;
  priority: 'high' | 'medium' | 'low';
}

export interface SyncQueueStatus {
  pendingOperations: number;
  isProcessing: boolean;
  lastProcessTime?: Date;
  errors: string[];
}

class SyncQueueManager {
  private queue: SyncOperation[] = [];
  private isProcessing = false;
  private maxRetries = 3;
  private retryDelay = 1000; // Start with 1 second
  private listeners: Array<(status: SyncQueueStatus) => void> = [];
  private processingPromise: Promise<void> | null = null;

  /**
   * Add operation to sync queue
   */
  addOperation(operation: Omit<SyncOperation, 'id' | 'timestamp' | 'retryCount'>): string {
    const id = this.generateId();
    const syncOp: SyncOperation = {
      ...operation,
      id,
      timestamp: Date.now(),
      retryCount: 0,
      maxRetries: operation.maxRetries || this.maxRetries,
    };

    // Insert based on priority
    const insertIndex = this.queue.findIndex(op => 
      this.getPriorityValue(op.priority) > this.getPriorityValue(syncOp.priority)
    );
    
    if (insertIndex === -1) {
      this.queue.push(syncOp);
    } else {
      this.queue.splice(insertIndex, 0, syncOp);
    }

    this.saveQueue();
    this.notifyListeners();
    
    // Auto-start processing if online
    if (typeof navigator !== 'undefined' && navigator.onLine && !this.isProcessing) {
      this.processQueue();
    }

    return id;
  }

  /**
   * Process queued operations
   */
  async processQueue(): Promise<void> {
    if (this.isProcessing || this.queue.length === 0) {
      return this.processingPromise || Promise.resolve();
    }

    this.isProcessing = true;
    this.notifyListeners();

    this.processingPromise = this.doProcessQueue();
    await this.processingPromise;

    this.isProcessing = false;
    this.processingPromise = null;
    this.notifyListeners();
  }

  private async doProcessQueue(): Promise<void> {
    const errors: string[] = [];

    while (this.queue.length > 0 && (typeof navigator === 'undefined' || navigator.onLine)) {
      const operation = this.queue[0];

      try {
        await this.executeOperation(operation);
        this.queue.shift(); // Remove successful operation
        this.saveQueue();
      } catch (error) {
        operation.retryCount++;
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        
        if (operation.retryCount >= operation.maxRetries) {
          // Max retries reached, remove from queue
          this.queue.shift();
          errors.push(`Failed to sync ${operation.type} ${operation.collection}/${operation.documentId}: ${errorMessage}`);
          console.error('Sync operation failed permanently:', operation, error);
        } else {
          // Retry with exponential backoff
          const delay = this.retryDelay * Math.pow(2, operation.retryCount - 1);
          await this.delay(delay);
        }
        
        this.saveQueue();
      }

      this.notifyListeners();
    }

    // Store errors for user notification
    if (errors.length > 0) {
      this.notifyListeners();
    }
  }

  private async executeOperation(operation: SyncOperation): Promise<void> {
    const { CloudSync } = await import('./cloudSync');
    
    // Get current user from auth context
    const user = await this.getCurrentUser();
    if (!user) {
      throw new Error('User not authenticated');
    }

    switch (operation.type) {
      case 'upload':
        const uploadResult = await CloudSync.uploadData(
          user,
          operation.collection,
          operation.documentId,
          operation.data
        );
        if (!uploadResult.success) {
          throw new Error(uploadResult.error || 'Upload failed');
        }
        break;

      case 'download':
        const downloadResult = await CloudSync.downloadData(
          user,
          operation.collection,
          operation.documentId
        );
        if (!downloadResult.success) {
          throw new Error(downloadResult.error || 'Download failed');
        }
        break;

      case 'delete':
        const deleteResult = await CloudSync.deleteData(
          user,
          operation.collection,
          operation.documentId
        );
        if (!deleteResult.success) {
          throw new Error(deleteResult.error || 'Delete failed');
        }
        break;

      default:
        throw new Error(`Unknown operation type: ${operation.type}`);
    }
  }

  private async getCurrentUser() {
    // Get user from Firebase Auth
    const { getAuth } = await import('firebase/auth');
    const auth = getAuth();
    return auth.currentUser;
  }

  /**
   * Get queue status
   */
  getStatus(): SyncQueueStatus {
    return {
      pendingOperations: this.queue.length,
      isProcessing: this.isProcessing,
      lastProcessTime: this.queue.length === 0 ? new Date() : undefined,
      errors: this.getRecentErrors(),
    };
  }

  /**
   * Clear all pending operations
   */
  clearQueue(): void {
    this.queue = [];
    this.saveQueue();
    this.notifyListeners();
  }

  /**
   * Remove specific operation
   */
  removeOperation(id: string): boolean {
    const index = this.queue.findIndex(op => op.id === id);
    if (index !== -1) {
      this.queue.splice(index, 1);
      this.saveQueue();
      this.notifyListeners();
      return true;
    }
    return false;
  }

  /**
   * Subscribe to queue status changes
   */
  subscribe(listener: (status: SyncQueueStatus) => void): () => void {
    this.listeners.push(listener);
    return () => {
      const index = this.listeners.indexOf(listener);
      if (index !== -1) {
        this.listeners.splice(index, 1);
      }
    };
  }

  /**
   * Initialize queue from localStorage
   */
  initializeQueue(): void {
    try {
      const saved = localStorage.getItem('doshi_sync_queue');
      if (saved) {
        this.queue = JSON.parse(saved);
      }
    } catch (error) {
      console.error('Failed to load sync queue:', error);
      this.queue = [];
    }

    // Start processing if online
    if (typeof navigator === 'undefined' || navigator.onLine) {
      this.processQueue();
    }

    // Listen for online events
    window.addEventListener('online', () => {
      this.processQueue();
    });
  }

  private saveQueue(): void {
    try {
      localStorage.setItem('doshi_sync_queue', JSON.stringify(this.queue));
    } catch (error) {
      console.error('Failed to save sync queue:', error);
    }
  }

  private notifyListeners(): void {
    const status = this.getStatus();
    this.listeners.forEach(listener => {
      try {
        listener(status);
      } catch (error) {
        console.error('Sync queue listener error:', error);
      }
    });
  }

  private generateId(): string {
    return `sync_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private getPriorityValue(priority: string): number {
    switch (priority) {
      case 'high': return 1;
      case 'medium': return 2;
      case 'low': return 3;
      default: return 2;
    }
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private getRecentErrors(): string[] {
    // In a real implementation, you'd store errors with timestamps
    // and return only recent ones
    return [];
  }
}

// Export singleton instance
export const syncQueue = new SyncQueueManager();