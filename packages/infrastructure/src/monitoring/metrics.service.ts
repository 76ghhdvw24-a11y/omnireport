import { Registry, Counter, Histogram, Gauge, collectDefaultMetrics } from 'prom-client';

export const metricsRegistry = new Registry();

collectDefaultMetrics({ register: metricsRegistry });

export const httpRequestsTotal = new Counter({
  name: 'http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'path', 'status'],
  registers: [metricsRegistry],
});

export const httpRequestDuration = new Histogram({
  name: 'http_request_duration_seconds',
  help: 'HTTP request duration in seconds',
  labelNames: ['method', 'path'],
  buckets: [0.01, 0.05, 0.1, 0.5, 1, 2, 5],
  registers: [metricsRegistry],
});

export const activeConnections = new Gauge({
  name: 'http_active_connections',
  help: 'Number of active HTTP connections',
  registers: [metricsRegistry],
});

export const reportsGeneratedTotal = new Counter({
  name: 'reports_generated_total',
  help: 'Total number of reports generated',
  labelNames: ['status'],
  registers: [metricsRegistry],
});

export const reportGenerationDuration = new Histogram({
  name: 'report_generation_duration_seconds',
  help: 'Report generation duration in seconds',
  labelNames: ['stage'],
  buckets: [0.1, 0.5, 1, 2, 5, 10, 30, 60],
  registers: [metricsRegistry],
});

export const aiApiCallsTotal = new Counter({
  name: 'ai_api_calls_total',
  help: 'Total number of AI API calls',
  labelNames: ['provider', 'model', 'status'],
  registers: [metricsRegistry],
});

export const aiApiLatency = new Histogram({
  name: 'ai_api_latency_seconds',
  help: 'AI API latency in seconds',
  labelNames: ['provider', 'model'],
  buckets: [0.1, 0.5, 1, 2, 5, 10, 30],
  registers: [metricsRegistry],
});

export const queueJobsTotal = new Counter({
  name: 'queue_jobs_total',
  help: 'Total number of queue jobs',
  labelNames: ['queue', 'status'],
  registers: [metricsRegistry],
});

export const databaseConnectionsActive = new Gauge({
  name: 'database_connections_active',
  help: 'Number of active database connections',
  registers: [metricsRegistry],
});

export async function getMetrics(): Promise<string> {
  return metricsRegistry.metrics();
}

export function getContentType(): string {
  return metricsRegistry.contentType;
}