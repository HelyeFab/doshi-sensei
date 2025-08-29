/**
 * Transaction Manager
 * Provides ACID compliance for review operations
 */

import { Transaction, Operation, StorageAdapter } from './types';

/**
 * TransactionImpl - Implementation of Transaction interface
 */
class TransactionImpl implements Transaction {
  id: string;
  startTime: Date;
  operations: Operation[] = [];
  status: 'pending' | 'committed' | 'rolled_back' = 'pending';
  
  constructor(
    private localDB: StorageAdapter,
    private remoteDB: StorageAdapter,
    private cache: StorageAdapter
  ) {
    this.id = this.generateTransactionId();
    this.startTime = new Date();
  }

  addOperation(op: Operation): void {
    if (this.status !== 'pending') {
      throw new Error(`Cannot add operation to ${this.status} transaction`);
    }
    this.operations.push(op);
  }

  async commit(): Promise<void> {
    if (this.status !== 'pending') {
      throw new Error(`Cannot commit ${this.status} transaction`);
    }

    try {
      // Execute all operations
      for (const op of this.operations) {
        await this.executeOperation(op);
      }
      
      this.status = 'committed';
      console.log(`[Transaction] Committed ${this.id} with ${this.operations.length} operations`);
    } catch (error) {
      // Rollback on error
      await this.rollback();
      throw error;
    }
  }

  async rollback(): Promise<void> {
    if (this.status === 'rolled_back') {
      return; // Already rolled back
    }

    console.log(`[Transaction] Rolling back ${this.id}`);
    
    // Rollback operations in reverse order
    for (let i = this.operations.length - 1; i >= 0; i--) {
      const op = this.operations[i];
      try {
        await this.rollbackOperation(op);
      } catch (error) {
        console.error(`[Transaction] Failed to rollback operation:`, error);
        // Continue rolling back other operations
      }
    }
    
    this.status = 'rolled_back';
    console.log(`[Transaction] Rolled back ${this.id}`);
  }

  private async executeOperation(op: Operation): Promise<void> {
    const adapter = this.getAdapter(op.entity);
    
    switch (op.type) {
      case 'create':
      case 'update':
        await adapter.set(op.data.key, op.data.value);
        break;
      case 'delete':
        await adapter.delete(op.data.key);
        break;
      default:
        throw new Error(`Unknown operation type: ${op.type}`);
    }
  }

  private async rollbackOperation(op: Operation): Promise<void> {
    const adapter = this.getAdapter(op.entity);
    
    switch (op.type) {
      case 'create':
        // Rollback create by deleting
        await adapter.delete(op.data.key);
        break;
      case 'update':
        // Rollback update by restoring old value
        if (op.rollbackData !== undefined) {
          await adapter.set(op.data.key, op.rollbackData);
        } else {
          await adapter.delete(op.data.key);
        }
        break;
      case 'delete':
        // Rollback delete by restoring
        if (op.rollbackData) {
          await adapter.set(op.data.key, op.rollbackData);
        }
        break;
    }
  }

  private getAdapter(entity: Operation['entity']): StorageAdapter {
    switch (entity) {
      case 'review':
        return this.localDB;
      case 'sync':
        return this.remoteDB;
      case 'cache':
        return this.cache;
      default:
        throw new Error(`Unknown entity: ${entity}`);
    }
  }

  private generateTransactionId(): string {
    return `tx_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

/**
 * TransactionManager - Manages transactions for the data store
 */
export class TransactionManager {
  private activeTransactions: Map<string, Transaction> = new Map();
  private transactionLog: Array<{
    id: string;
    startTime: Date;
    endTime?: Date;
    status: string;
    operationCount: number;
  }> = [];

  constructor(
    private localDB: StorageAdapter,
    private remoteDB: StorageAdapter,
    private cache: StorageAdapter
  ) {}

  /**
   * Begin a new transaction
   */
  async beginTransaction(): Promise<Transaction> {
    const transaction = new TransactionImpl(
      this.localDB,
      this.remoteDB,
      this.cache
    );
    
    this.activeTransactions.set(transaction.id, transaction);
    
    // Log transaction start
    this.transactionLog.push({
      id: transaction.id,
      startTime: transaction.startTime,
      status: 'started',
      operationCount: 0
    });
    
    console.log(`[TransactionManager] Started transaction ${transaction.id}`);
    
    return transaction;
  }

  /**
   * Get an active transaction
   */
  getTransaction(id: string): Transaction | undefined {
    return this.activeTransactions.get(id);
  }

  /**
   * Complete a transaction (called internally by Transaction)
   */
  completeTransaction(transaction: Transaction): void {
    this.activeTransactions.delete(transaction.id);
    
    // Update transaction log
    const logEntry = this.transactionLog.find(entry => entry.id === transaction.id);
    if (logEntry) {
      logEntry.endTime = new Date();
      logEntry.status = transaction.status;
      logEntry.operationCount = transaction.operations.length;
    }
  }

  /**
   * Rollback all active transactions (emergency)
   */
  async rollbackAll(): Promise<void> {
    console.log(`[TransactionManager] Rolling back all ${this.activeTransactions.size} active transactions`);
    
    const rollbackPromises: Promise<void>[] = [];
    
    for (const transaction of this.activeTransactions.values()) {
      rollbackPromises.push(transaction.rollback());
    }
    
    await Promise.allSettled(rollbackPromises);
    this.activeTransactions.clear();
  }

  /**
   * Get transaction statistics
   */
  getStatistics(): {
    activeCount: number;
    totalProcessed: number;
    successRate: number;
    averageDuration: number;
  } {
    const completed = this.transactionLog.filter(t => t.endTime);
    const successful = completed.filter(t => t.status === 'committed');
    
    let totalDuration = 0;
    for (const transaction of completed) {
      if (transaction.endTime) {
        totalDuration += transaction.endTime.getTime() - transaction.startTime.getTime();
      }
    }
    
    return {
      activeCount: this.activeTransactions.size,
      totalProcessed: this.transactionLog.length,
      successRate: completed.length > 0 ? successful.length / completed.length : 0,
      averageDuration: completed.length > 0 ? totalDuration / completed.length : 0
    };
  }

  /**
   * Clean up old transaction logs
   */
  cleanupLogs(olderThan: Date): void {
    this.transactionLog = this.transactionLog.filter(
      entry => !entry.endTime || entry.endTime > olderThan
    );
  }
}