export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
}

interface LogEntry {
  level: LogLevel;
  message: string;
  timestamp: Date;
  context?: Record<string, any>;
  component?: string;
}

class Logger {
  private logLevel: LogLevel;
  private isDevelopment: boolean;
  private logs: LogEntry[] = [];
  private maxLogs = 1000;

  constructor() {
    this.isDevelopment = process.env.NODE_ENV === 'development';
    this.logLevel = this.isDevelopment ? LogLevel.DEBUG : LogLevel.WARN;
  }

  private shouldLog(level: LogLevel): boolean {
    return level >= this.logLevel;
  }

  private createLogEntry(level: LogLevel, message: string, context?: Record<string, any>, component?: string): LogEntry {
    const entry: LogEntry = {
      level,
      message,
      timestamp: new Date()
    };
    if (context) entry.context = context;
    if (component) entry.component = component;
    return entry;
  }

  private addToBuffer(entry: LogEntry): void {
    this.logs.push(entry);
    if (this.logs.length > this.maxLogs) {
      this.logs.shift();
    }
  }

  private formatMessage(entry: LogEntry): string {
    const timestamp = entry.timestamp.toISOString();
    const component = entry.component ? `[${entry.component}]` : '';
    const context = entry.context ? JSON.stringify(entry.context) : '';
    return `${timestamp} ${component} ${entry.message} ${context}`.trim();
  }

  debug(message: string, context?: Record<string, any>, component?: string): void {
    if (!this.shouldLog(LogLevel.DEBUG)) return;
    
    const entry = this.createLogEntry(LogLevel.DEBUG, message, context, component);
    this.addToBuffer(entry);
    
    if (this.isDevelopment) {
      console.debug(this.formatMessage(entry));
    }
  }

  info(message: string, context?: Record<string, any>, component?: string): void {
    if (!this.shouldLog(LogLevel.INFO)) return;
    
    const entry = this.createLogEntry(LogLevel.INFO, message, context, component);
    this.addToBuffer(entry);
    
    if (this.isDevelopment) {
      console.info(this.formatMessage(entry));
    }
  }

  warn(message: string, context?: Record<string, any>, component?: string): void {
    if (!this.shouldLog(LogLevel.WARN)) return;
    
    const entry = this.createLogEntry(LogLevel.WARN, message, context, component);
    this.addToBuffer(entry);
    
    console.warn(this.formatMessage(entry));
  }

  error(message: string, error?: Error, context?: Record<string, any>, component?: string): void {
    const entry = this.createLogEntry(LogLevel.ERROR, message, { 
      ...context, 
      error: error?.message,
      stack: error?.stack 
    }, component);
    this.addToBuffer(entry);
    
    console.error(this.formatMessage(entry));
    
    // Send to error monitoring service in production
    const gtag = (window as unknown as { gtag?: (event: string, action: string, params?: Record<string, unknown>) => void }).gtag;
    if (!this.isDevelopment && gtag) {
      gtag('event', 'exception', {
        description: message,
        fatal: false
      });
    }
  }

  // Performance logging
  performance(componentName: string, duration: number, threshold = 100): void {
    const message = `Performance: ${componentName} rendered in ${duration.toFixed(2)}ms`;
    
    if (duration > threshold) {
      this.warn(message, { componentName, duration, threshold }, 'Performance');
    } else {
      this.debug(message, { componentName, duration }, 'Performance');
    }
  }

  // Get recent logs for debugging
  getRecentLogs(count = 50): LogEntry[] {
    return this.logs.slice(-count);
  }

  // Clear log buffer
  clearLogs(): void {
    this.logs = [];
  }

  // Export logs for debugging
  exportLogs(): string {
    return JSON.stringify(this.logs, null, 2);
  }
}

// Create singleton instance
export const logger = new Logger();

// Convenience functions
export const log = {
  debug: (message: string, context?: Record<string, any>, component?: string) => 
    logger.debug(message, context, component),
  info: (message: string, context?: Record<string, any>, component?: string) => 
    logger.info(message, context, component),
  warn: (message: string, context?: Record<string, any>, component?: string) => 
    logger.warn(message, context, component),
  error: (message: string, error?: Error, context?: Record<string, any>, component?: string) => 
    logger.error(message, error, context, component),
  performance: (componentName: string, duration: number, threshold?: number) => 
    logger.performance(componentName, duration, threshold),
};

export default logger;
