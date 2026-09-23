import { Registry, collectDefaultMetrics, Counter, Histogram, Gauge } from 'prom-client';

export const registry = new Registry();

collectDefaultMetrics({ register: registry });

export const httpRequestDuration = new Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status_code'],
  registers: [registry],
  buckets: [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10],
});

export const httpRequestTotal = new Counter({
  name: 'http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'route', 'status_code'],
  registers: [registry],
});

export const activeConnections = new Gauge({
  name: 'active_connections',
  help: 'Number of active connections',
  registers: [registry],
});

export function recordHttpRequest(method: string, route: string, statusCode: number, durationSeconds: number): void {
  httpRequestDuration.labels(method, route, String(statusCode)).observe(durationSeconds);
  httpRequestTotal.labels(method, route, String(statusCode)).inc();
}

export function incrementActiveConnections(): void {
  activeConnections.inc();
}

export function decrementActiveConnections(): void {
  activeConnections.dec();
}
