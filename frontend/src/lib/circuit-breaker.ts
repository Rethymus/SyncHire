/**
 * Circuit Breaker Implementation
 * Prevents cascading failures by failing fast when a service is down
 */

import { logger, LogCategory } from './logger';

export enum CircuitState {
  CLOSED = 'CLOSED',     // Normal operation
  OPEN = 'OPEN',         // Circuit is open, rejecting requests
  HALF_OPEN = 'HALF_OPEN' // Testing if service has recovered
}

export interface CircuitBreakerConfig {
  failureThreshold: number;  // Number of failures before opening
  successThreshold: number;  // Number of successes to close circuit
  timeout: number;           // Time in ms before attempting recovery
  monitoringPeriod: number;  // Time in ms to monitor for failures
}

export interface CircuitBreakerStats {
  state: CircuitState;
  failureCount: number;
  successCount: number;
  lastFailureTime: number | null;
  lastSuccessTime: number | null;
  lastStateChange: number;
  rejectionCount: number;
}

const DEFAULT_CONFIG: CircuitBreakerConfig = {
  failureThreshold: 5,
  successThreshold: 2,
  timeout: 60000, // 1 minute
  monitoringPeriod: 10000, // 10 seconds
};

export class CircuitBreaker {
  private config: CircuitBreakerConfig;
  private state: CircuitState = CircuitState.CLOSED;
  private failureCount: number = 0;
  private successCount: number = 0;
  private lastFailureTime: number | null = null;
  private lastSuccessTime: number | null = null;
  private lastStateChange: number = Date.now();
  private rejectionCount: number = 0;
  private nextAttemptTime: number = 0;

  constructor(config: Partial<CircuitBreakerConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Execute a function through the circuit breaker
   */
  async execute<T>(fn: () => Promise<T>): Promise<T> {
    if (!this.canExecute()) {
      this.rejectionCount++;
      throw new Error('Circuit breaker is OPEN - rejecting request');
    }

    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  /**
   * Check if the request can be executed
   */
  private canExecute(): boolean {
    const now = Date.now();

    // If circuit is OPEN, check if we should attempt recovery
    if (this.state === CircuitState.OPEN) {
      if (now >= this.nextAttemptTime) {
        this.transitionTo(CircuitState.HALF_OPEN);
        logger.info(
          LogCategory.API,
          'Circuit breaker transitioning to HALF_OPEN'
        );
        return true;
      }
      return false;
    }

    // If circuit is HALF_OPEN or CLOSED, allow execution
    return true;
  }

  /**
   * Handle successful execution
   */
  private onSuccess(): void {
    this.lastSuccessTime = Date.now();
    this.failureCount = 0;

    if (this.state === CircuitState.HALF_OPEN) {
      this.successCount++;
      if (this.successCount >= this.config.successThreshold) {
        this.transitionTo(CircuitState.CLOSED);
        logger.info(
          LogCategory.API,
          'Circuit breaker transitioning to CLOSED'
        );
      }
    } else {
      this.successCount++;
    }
  }

  /**
   * Handle failed execution
   */
  private onFailure(): void {
    this.lastFailureTime = Date.now();
    this.failureCount++;
    this.successCount = 0;

    logger.warn(
      LogCategory.API,
      `Circuit breaker failure: ${this.failureCount}/${this.config.failureThreshold}`
    );

    if (this.failureCount >= this.config.failureThreshold) {
      if (this.state === CircuitState.HALF_OPEN) {
        // If we fail in HALF_OPEN, go back to OPEN
        this.transitionTo(CircuitState.OPEN);
        logger.error(
          LogCategory.API,
          'Circuit breaker transitioning back to OPEN (recovery failed)'
        );
      } else if (this.state === CircuitState.CLOSED) {
        this.transitionTo(CircuitState.OPEN);
        logger.error(
          LogCategory.API,
          'Circuit breaker transitioning to OPEN'
        );
      }
    }
  }

  /**
   * Transition to a new state
   */
  private transitionTo(newState: CircuitState): void {
    const oldState = this.state;
    this.state = newState;
    this.lastStateChange = Date.now();

    if (newState === CircuitState.OPEN) {
      this.nextAttemptTime = Date.now() + this.config.timeout;
    }

    logger.info(
      LogCategory.API,
      `Circuit breaker state transition: ${oldState} -> ${newState}`,
      {
        failureCount: this.failureCount,
        successCount: this.successCount,
        rejectionCount: this.rejectionCount,
      }
    );
  }

  /**
   * Get current circuit breaker statistics
   */
  getStats(): CircuitBreakerStats {
    return {
      state: this.state,
      failureCount: this.failureCount,
      successCount: this.successCount,
      lastFailureTime: this.lastFailureTime,
      lastSuccessTime: this.lastSuccessTime,
      lastStateChange: this.lastStateChange,
      rejectionCount: this.rejectionCount,
    };
  }

  /**
   * Reset the circuit breaker to CLOSED state
   */
  reset(): void {
    this.state = CircuitState.CLOSED;
    this.failureCount = 0;
    this.successCount = 0;
    this.lastFailureTime = null;
    this.lastSuccessTime = null;
    this.lastStateChange = Date.now();
    this.rejectionCount = 0;
    this.nextAttemptTime = 0;

    logger.info(LogCategory.API, 'Circuit breaker reset to CLOSED state');
  }

  /**
   * Manually open the circuit (for maintenance)
   */
  open(): void {
    this.transitionTo(CircuitState.OPEN);
  }

  /**
   * Manually close the circuit (for recovery)
   */
  close(): void {
    this.transitionTo(CircuitState.CLOSED);
  }
}

/**
 * Circuit Breaker Registry
 * Manages multiple circuit breakers for different services
 */
class CircuitBreakerRegistry {
  private circuitBreakers = new Map<string, CircuitBreaker>();

  /**
   * Get or create a circuit breaker for a service
   */
  get(name: string, config?: Partial<CircuitBreakerConfig>): CircuitBreaker {
    if (!this.circuitBreakers.has(name)) {
      this.circuitBreakers.set(name, new CircuitBreaker(config));
    }
    return this.circuitBreakers.get(name)!;
  }

  /**
   * Get statistics for all circuit breakers
   */
  getAllStats(): Map<string, CircuitBreakerStats> {
    const stats = new Map<string, CircuitBreakerStats>();
    this.circuitBreakers.forEach((cb, name) => {
      stats.set(name, cb.getStats());
    });
    return stats;
  }

  /**
   * Reset all circuit breakers
   */
  resetAll(): void {
    this.circuitBreakers.forEach((cb) => cb.reset());
  }

  /**
   * Remove a circuit breaker
   */
  remove(name: string): boolean {
    return this.circuitBreakers.delete(name);
  }
}

// Export singleton registry
export const circuitBreakerRegistry = new CircuitBreakerRegistry();

/**
 * Pre-configured circuit breakers for common services
 */
export const circuitBreakers = {
  api: circuitBreakerRegistry.get('api', {
    failureThreshold: 5,
    successThreshold: 2,
    timeout: 60000,
  }),
  auth: circuitBreakerRegistry.get('auth', {
    failureThreshold: 3,
    successThreshold: 2,
    timeout: 30000,
  }),
  upload: circuitBreakerRegistry.get('upload', {
    failureThreshold: 3,
    successThreshold: 1,
    timeout: 45000,
  }),
  search: circuitBreakerRegistry.get('search', {
    failureThreshold: 5,
    successThreshold: 2,
    timeout: 60000,
  }),
};
