/**
 * Circuit Breaker for External Routing Engines.
 *
 * Prevents hammering an unavailable routing service (e.g. OSRM) by opening
 * the circuit after consecutive failures, immediately diverting queries to
 * the Haversine fallback with zero latency, and probing for recovery.
 */
import { LatLngPoint, RouteResult, RoutingProvider } from "./routing.interface";

export enum CircuitState {
  CLOSED = "CLOSED", // Normal operations
  OPEN = "OPEN", // Tripped — diverting to fallback
  HALF_OPEN = "HALF_OPEN", // Probing primary engine
}

export interface CircuitBreakerOptions {
  failureThreshold?: number; // Failures before opening (default 3)
  resetTimeoutMs?: number; // Time in OPEN state before HALF_OPEN (default 30,000ms)
}

export class RoutingCircuitBreaker implements RoutingProvider {
  public readonly name: string;
  private state: CircuitState = CircuitState.CLOSED;
  private consecutiveFailures = 0;
  private lastFailureTime = 0;
  private readonly failureThreshold: number;
  private readonly resetTimeoutMs: number;
  private readonly primary: RoutingProvider;
  private readonly fallback: RoutingProvider;

  // Operational metrics
  public metrics = {
    totalRequests: 0,
    primarySuccesses: 0,
    primaryFailures: 0,
    fallbackUses: 0,
    circuitTrips: 0,
  };

  constructor(
    primary: RoutingProvider,
    fallback: RoutingProvider,
    options: CircuitBreakerOptions = {},
  ) {
    this.primary = primary;
    this.fallback = fallback;
    this.name = `${primary.name}_with_${fallback.name}`;
    this.failureThreshold = options.failureThreshold ?? 3;
    this.resetTimeoutMs = options.resetTimeoutMs ?? 30000;
  }

  public getState(): CircuitState {
    // If OPEN and reset timeout expired, transition to HALF_OPEN
    if (
      this.state === CircuitState.OPEN &&
      Date.now() - this.lastFailureTime > this.resetTimeoutMs
    ) {
      this.state = CircuitState.HALF_OPEN;
    }
    return this.state;
  }

  public async route(
    origin: LatLngPoint,
    destination: LatLngPoint,
  ): Promise<RouteResult> {
    this.metrics.totalRequests++;
    const currentState = this.getState();

    if (currentState === CircuitState.OPEN) {
      this.metrics.fallbackUses++;
      return this.fallback.route(origin, destination);
    }

    try {
      const result = await this.primary.route(origin, destination);
      this.onSuccess();
      return result;
    } catch (err) {
      this.onFailure(err);
      this.metrics.fallbackUses++;
      return this.fallback.route(origin, destination);
    }
  }

  private onSuccess(): void {
    this.metrics.primarySuccesses++;
    if (this.state === CircuitState.HALF_OPEN) {
      this.state = CircuitState.CLOSED;
      this.consecutiveFailures = 0;
    } else {
      this.consecutiveFailures = 0;
    }
  }

  private onFailure(error: unknown): void {
    this.metrics.primaryFailures++;
    this.consecutiveFailures++;
    this.lastFailureTime = Date.now();

    if (
      this.state === CircuitState.HALF_OPEN ||
      this.consecutiveFailures >= this.failureThreshold
    ) {
      this.state = CircuitState.OPEN;
      this.metrics.circuitTrips++;
    }
  }

  public async healthCheck(): Promise<boolean> {
    const primaryHealthy = await this.primary.healthCheck();
    if (primaryHealthy && this.state !== CircuitState.CLOSED) {
      this.state = CircuitState.CLOSED;
      this.consecutiveFailures = 0;
    }
    return primaryHealthy;
  }

  /** Force reset circuit state (useful for tests and administrative resets) */
  public reset(): void {
    this.state = CircuitState.CLOSED;
    this.consecutiveFailures = 0;
    this.lastFailureTime = 0;
  }
}
