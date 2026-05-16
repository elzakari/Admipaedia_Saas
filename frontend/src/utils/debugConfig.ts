/**
 * Debug configuration and utilities for development mode
 */

import React from "react";

interface DebugConfig {
  enabled: boolean;
  logLevel: 'debug' | 'info' | 'warn' | 'error';
  showPerformanceMetrics: boolean;
  enableHotReload: boolean;
  enableSourceMaps: boolean;
  enableReactDevTools: boolean;
}

interface ApiDebugConfig {
  baseURL: string;
  timeout: number;
  retries: number;
  enableRequestLogging: boolean;
  enableResponseLogging: boolean;
}

interface WebSocketDebugConfig {
  url: string;
  enableLogging: boolean;
  reconnectAttempts: number;
  reconnectInterval: number;
}

interface MonitoringConfig {
  enableErrorBoundaries: boolean;
  enablePerformanceMonitoring: boolean;
  enableMemoryLeakDetection: boolean;
  enableRenderTracking: boolean;
}

class DebugManager {
  private config: {
    debug: DebugConfig;
    api: ApiDebugConfig;
    websocket: WebSocketDebugConfig;
    monitoring: MonitoringConfig;
  };

  constructor() {
    this.config = {
      debug: {
        enabled: process.env.NODE_ENV === 'development',
        logLevel: 'debug',
        showPerformanceMetrics: true,
        enableHotReload: true,
        enableSourceMaps: true,
        enableReactDevTools: true
      },
      api: {
        baseURL: import.meta.env.VITE_API_URL || '/api/v1',
        timeout: 30000,
        retries: 3,
        enableRequestLogging: true,
        enableResponseLogging: true
      },
      websocket: {
        url: import.meta.env.VITE_SOCKET_URL || '',
        enableLogging: true,
        reconnectAttempts: 5,
        reconnectInterval: 3000
      },
      monitoring: {
        enableErrorBoundaries: true,
        enablePerformanceMonitoring: true,
        enableMemoryLeakDetection: true,
        enableRenderTracking: true
      }
    };

    this.initializeDebugTools();
  }

  private initializeDebugTools(): void {
    console.log('🔧 Initializing debug tools...', {
      config: this.config,
      version: process.env.REACT_APP_VERSION || '1.0.0',
      buildTime: new Date().toISOString(),
      environment: process.env.NODE_ENV
    });

    // Enable React DevTools
    if (this.config.debug.enableReactDevTools && typeof window !== 'undefined') {
      const globalHook = (window as any).__REACT_DEVTOOLS_GLOBAL_HOOK__;
      if (globalHook) {
        globalHook.onCommitFiberRoot = globalHook.onCommitFiberRoot || (() => {});
      }
    }

    // Setup performance monitoring
    if (this.config.monitoring.enablePerformanceMonitoring) {
      this.setupPerformanceMonitoring();
    }

    // Setup memory leak detection
    if (this.config.monitoring.enableMemoryLeakDetection) {
      this.setupMemoryLeakDetection();
    }

    console.log('🔧 Debug tools initialized for ADMIPAEDIA Frontend');
  }

  private setupPerformanceMonitoring(): void {
    // Monitor component render times
    const observer = new PerformanceObserver((list) => {
      list.getEntries().forEach((entry) => {
        if (entry.duration > 16) { // Longer than one frame
          console.warn(`⚠️ Slow render detected: ${entry.name} took ${entry.duration.toFixed(2)}ms`);
        }
      });
    });

    observer.observe({ entryTypes: ['measure'] });

    // Monitor memory usage
    setInterval(() => {
      if ('memory' in performance) {
        const memory = (performance as any).memory;
        const memoryUsage = {
          used: Math.round(memory.usedJSHeapSize / 1048576),
          total: Math.round(memory.totalJSHeapSize / 1048576),
          limit: Math.round(memory.jsHeapSizeLimit / 1048576)
        };

        if (memoryUsage.used > memoryUsage.limit * 0.8) {
          console.warn('⚠️ High memory usage detected:', memoryUsage);
        }
      }
    }, 30000); // Check every 30 seconds
  }

  private setupMemoryLeakDetection(): void {
    let componentCount = 0;
    const originalCreateElement = React.createElement;

    (React as any).createElement = function(type: any, props?: any, ...children: any[]): React.ReactElement {
      componentCount++;
      return originalCreateElement.call(this, type, props, ...children);
    };

    setInterval(() => {
      console.log(`📊 Component instances created: ${componentCount}`);
      if (componentCount > 10000) {
        console.warn('⚠️ Potential memory leak: High component creation count');
      }
    }, 60000); // Check every minute
  }

  public getConfig() {
    return this.config;
  }

  public isDebugEnabled(): boolean {
    return this.config.debug.enabled;
  }

  public logApiRequest(url: string, method: string, data?: any): void {
    if (this.config.api.enableRequestLogging && this.config.debug.enabled) {
      console.group(`🌐 API Request: ${method} ${url}`);
      console.log('URL:', url);
      console.log('Method:', method);
      if (data) console.log('Data:', data);
      console.log('Timestamp:', new Date().toISOString());
      console.groupEnd();
    }
  }

  public logApiResponse(url: string, status: number, data?: any, duration?: number): void {
    if (this.config.api.enableResponseLogging && this.config.debug.enabled) {
      const statusColor = status >= 200 && status < 300 ? '✅' : '❌';
      console.group(`${statusColor} API Response: ${status} ${url}`);
      console.log('Status:', status);
      console.log('URL:', url);
      if (duration) console.log('Duration:', `${duration}ms`);
      if (data) console.log('Response:', data);
      console.log('Timestamp:', new Date().toISOString());
      console.groupEnd();
    }
  }

  public logWebSocketEvent(event: string, data?: any): void {
    if (this.config.websocket.enableLogging && this.config.debug.enabled) {
      console.log(`🔌 WebSocket ${event}:`, data || '', new Date().toISOString());
    }
  }

  public measurePerformance<T>(name: string, fn: () => T): T {
    if (!this.config.debug.enabled) return fn();

    const start = performance.now();
    const result = fn();
    const end = performance.now();
    const duration = end - start;

    console.log(`⏱️ Performance: ${name} took ${duration.toFixed(2)}ms`);
    
    if (duration > 100) {
      console.warn(`⚠️ Slow operation: ${name} took ${duration.toFixed(2)}ms`);
    }

    return result;
  }
}

// Create singleton instance
export const debugManager = new DebugManager();

// Export utility functions
export const debugLog = (message: string, ...args: any[]) => {
  if (debugManager.isDebugEnabled()) {
    console.log(`🔧 [DEBUG] ${message}`, ...args);
  }
};

export const debugWarn = (message: string, ...args: any[]) => {
  if (debugManager.isDebugEnabled()) {
    console.warn(`⚠️ [DEBUG] ${message}`, ...args);
  }
};

export const debugError = (message: string, error?: Error, ...args: any[]) => {
  if (debugManager.isDebugEnabled()) {
    console.error(`❌ [DEBUG] ${message}`, error, ...args);
  }
};

export default debugManager;