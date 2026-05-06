import { log } from '../utils/logger';

export interface PerformanceMetric {
    name: string;
    value: number;
    timestamp: number;
    tags?: Record<string, string>;
}

export interface MetricSummary {
    avg: number;
    min: number;
    max: number;
    count: number;
    lastValue: number;
}

class PerformanceRegistry {
    private metrics: Map<string, PerformanceMetric[]> = new Map();
    private maxEntriesPerMetric = 100;
    private listeners: Set<(metric: PerformanceMetric) => void> = new Set();

    /**
     * Register a new performance measurement
     */
    public record(metric: PerformanceMetric): void {
        const existing = this.metrics.get(metric.name) || [];
        existing.push(metric);

        // Maintain window size
        if (existing.length > this.maxEntriesPerMetric) {
            existing.shift();
        }

        this.metrics.set(metric.name, existing);
        this.notifyListeners(metric);

        // Log slow operations
        if (metric.name.startsWith('api_') && metric.value > 1000) {
            log.warn(`Slow API call detected: ${metric.name} took ${metric.value.toFixed(2)}ms`, metric.tags);
        }
    }

    /**
     * Get summary statistics for a specific metric
     */
    public getSummary(name: string): MetricSummary | null {
        const values = this.metrics.get(name);
        if (!values || values.length === 0) return null;

        const numericValues = values.map(m => m.value);
        const sum = numericValues.reduce((a, b) => a + b, 0);

        return {
            avg: sum / values.length,
            min: Math.min(...numericValues),
            max: Math.max(...numericValues),
            count: values.length,
            lastValue: numericValues.length > 0 ? (numericValues[numericValues.length - 1] as number) : 0
        };
    }

    /**
     * Get all recorded metrics for a specific name
     */
    public getMetrics(name: string): PerformanceMetric[] {
        return this.metrics.get(name) || [];
    }

    /**
     * Subscribe to new measurements
     */
    public subscribe(callback: (metric: PerformanceMetric) => void): () => void {
        this.listeners.add(callback);
        return () => this.listeners.delete(callback);
    }

    private notifyListeners(metric: PerformanceMetric): void {
        this.listeners.forEach(listener => listener(metric));
    }

    /**
     * Get all metric names currently tracked
     */
    public getMetricNames(): string[] {
        return Array.from(this.metrics.keys());
    }

    /**
     * Clear all collected data
     */
    public clear(): void {
        this.metrics.clear();
    }
}

export const performanceRegistry = new PerformanceRegistry();
export default performanceRegistry;
