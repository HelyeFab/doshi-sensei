/**
 * Circuit breaker implementation for sync operations
 * Prevents cascading failures and provides graceful degradation
 */

import { CircuitState, CircuitBreakerConfig, SyncError } from '../core/interfaces';
import { CIRCUIT_BREAKER_CONFIG, LOG_PREFIXES, ERROR_CODES } from '../core/constants';

export class CircuitBreaker {
  private state: CircuitState = 'CLOSED';
  private failures: number = 0;
  private lastFailureTime: number = 0;
  private nextRetryTime: number = 0;
  private config: CircuitBreakerConfig;
  private logger: (message: string) => void;

  constructor(
    config: Partial<CircuitBreakerConfig> = {},
    logger: (message: string) => void = console.log
  ) {
    this.config = { ...CIRCUIT_BREAKER_CONFIG, ...config };
    this.logger = logger;
  }

  /**
   * Execute operation with circuit breaker protection
   */
  async execute<T>(operation: () => Promise<T>, operationName: string = 'unknown'): Promise<T> {
    // Check circuit state before attempting operation
    if (this.state === 'OPEN') {
      if (Date.now() < this.nextRetryTime) {
        this.logger(`${LOG_PREFIXES.SYNC} Circuit OPEN, rejecting ${operationName} operation`);
        throw new SyncError('Circuit breaker is OPEN', ERROR_CODES.CIRCUIT_OPEN);
      } else {
        // Time to try recovery
        this.state = 'HALF_OPEN';
        this.logger(`${LOG_PREFIXES.SYNC} Circuit transitioning to HALF_OPEN for ${operationName}`);
      }
    }

    try {
      this.logger(`${LOG_PREFIXES.SYNC} Executing ${operationName} operation (circuit: ${this.state})`);
      const result = await operation();
      
      // Success - reset circuit if it was in recovery mode
      if (this.state === 'HALF_OPEN') {
        this.reset();
        this.logger(`${LOG_PREFIXES.SYNC} Circuit HALF_OPEN test successful, resetting to CLOSED`);
      }
      
      return result;
    } catch (error) {
      // Failure - record and potentially open circuit
      this.recordFailure();
      this.logger(`${LOG_PREFIXES.SYNC} Operation ${operationName} failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      
      // Re-throw the original error
      throw error;
    }
  }

  /**
   * Record a failure and update circuit state
   */
  private recordFailure(): void {
    this.failures++;
    this.lastFailureTime = Date.now();

    if (this.state === 'HALF_OPEN') {
      // Immediate failure in half-open state - back to open
      this.state = 'OPEN';
      this.nextRetryTime = Date.now() + this.config.recoveryTimeout;
      this.logger(`${LOG_PREFIXES.SYNC} Circuit HALF_OPEN test failed, reopening until ${new Date(this.nextRetryTime).toISOString()}`);
    } else if (this.failures >= this.config.failureThreshold) {
      // Too many failures - open the circuit
      this.state = 'OPEN';
      this.nextRetryTime = Date.now() + this.config.recoveryTimeout;
      this.logger(`${LOG_PREFIXES.SYNC} Circuit OPENED due to ${this.failures} failures, recovery at ${new Date(this.nextRetryTime).toISOString()}`);
    } else {
      this.logger(`${LOG_PREFIXES.SYNC} Circuit failure ${this.failures}/${this.config.failureThreshold}, remaining CLOSED`);
    }
  }

  /**
   * Reset circuit breaker to closed state
   */
  reset(): void {
    this.state = 'CLOSED';
    this.failures = 0;
    this.lastFailureTime = 0;
    this.nextRetryTime = 0;
    this.logger(`${LOG_PREFIXES.SYNC} Circuit breaker reset to CLOSED`);
  }

  /**
   * Get current circuit breaker status
   */
  getStatus(): {
    state: CircuitState;
    failures: number;
    lastFailureTime: number;
    nextRetryTime: number;
    isOperational: boolean;
  } {
    return {
      state: this.state,
      failures: this.failures,
      lastFailureTime: this.lastFailureTime,
      nextRetryTime: this.nextRetryTime,
      isOperational: this.state === 'CLOSED' || 
                    (this.state === 'OPEN' && Date.now() >= this.nextRetryTime)
    };
  }

  /**
   * Force circuit to specific state (for testing)
   */
  forceState(state: CircuitState): void {
    this.logger(`${LOG_PREFIXES.SYNC} Force changing circuit state to ${state}`);
    this.state = state;
    
    if (state === 'CLOSED') {
      this.reset();
    } else if (state === 'OPEN') {
      this.nextRetryTime = Date.now() + this.config.recoveryTimeout;
    }
  }

  /**
   * Get failure rate over monitoring period
   */
  getFailureRate(): number {
    const monitoringWindowStart = Date.now() - this.config.monitoringPeriod;
    
    if (this.lastFailureTime < monitoringWindowStart) {
      return 0; // No recent failures
    }
    
    // Simplified calculation - in production, you might want to track
    // failures over time in a sliding window
    return this.failures;
  }

  /**
   * Check if circuit allows operations
   */
  isOperational(): boolean {
    return this.state === 'CLOSED' || 
           (this.state === 'OPEN' && Date.now() >= this.nextRetryTime);
  }
}