import { NextRequest } from 'next/server';

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

type LogContext = {
  userId?: string;
  requestId?: string;
  path?: string;
  method?: string;
  [key: string]: any;
};

export class Logger {
  private static instance: Logger;
  private logLevel: LogLevel;

  private constructor() {
    // Default log level based on environment
    this.logLevel = process.env.NODE_ENV === 'production' ? 'warn' : 'debug';
  }

  public static getInstance(): Logger {
    if (!Logger.instance) {
      Logger.instance = new Logger();
    }
    return Logger.instance;
  }

  public setLogLevel(level: LogLevel): void {
    this.logLevel = level;
  }

  private shouldLog(level: LogLevel): boolean {
    const levels: Record<LogLevel, number> = {
      debug: 0,
      info: 1,
      warn: 2,
      error: 3,
    };
    return levels[level] >= levels[this.logLevel];
  }

  private formatMessage(level: LogLevel, message: string, context: LogContext = {}): string {
    const timestamp = new Date().toISOString();
    const contextString = Object.keys(context).length 
      ? `\nContext: ${JSON.stringify(context, null, 2)}` 
      : '';
    
    return `[${timestamp}] [${level.toUpperCase()}] ${message}${contextString}`;
  }

  public debug(message: string, context: LogContext = {}): void {
    if (this.shouldLog('debug')) {
      console.debug(this.formatMessage('debug', message, context));
    }
  }

  public info(message: string, context: LogContext = {}): void {
    if (this.shouldLog('info')) {
      console.info(this.formatMessage('info', message, context));
    }
  }

  public warn(message: string, context: LogContext = {}): void {
    if (this.shouldLog('warn')) {
      console.warn(this.formatMessage('warn', message, context));
    }
  }

  public error(message: string, error?: Error, context: LogContext = {}): void {
    if (this.shouldLog('error')) {
      const errorInfo = error ? `\nError: ${error.message}\nStack: ${error.stack}` : '';
      console.error(this.formatMessage('error', `${message}${errorInfo}`, context));
    }
  }

  // Helper method for API routes
  public static apiError(
    error: Error, 
    message: string, 
    request: Request,
    context: Omit<LogContext, 'path' | 'method'> = {}
  ): void {
    const url = new URL(request.url);
    const logger = Logger.getInstance();
    
    logger.error(message, error, {
      ...context,
      path: url.pathname,
      method: request.method,
    });
  }
}

export const logger = Logger.getInstance();

// Helper function to create a request-scoped logger
export function createRequestLogger(request: Request) {
  const url = new URL(request.url);
  
  return {
    debug: (message: string, context: LogContext = {}) => 
      logger.debug(message, { ...context, path: url.pathname, method: request.method }),
      
    info: (message: string, context: LogContext = {}) => 
      logger.info(message, { ...context, path: url.pathname, method: request.method }),
      
    warn: (message: string, context: LogContext = {}) => 
      logger.warn(message, { ...context, path: url.pathname, method: request.method }),
      
    error: (message: string, error?: Error, context: LogContext = {}) => 
      logger.error(message, error, { ...context, path: url.pathname, method: request.method }),
  };
}
