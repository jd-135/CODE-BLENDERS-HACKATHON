type LogLevel = "debug" | "info" | "warn" | "error";

interface LogPayload {
  level: LogLevel;
  message: string;
  context?: Record<string, unknown>;
  timestamp: string;
}

class AppLogger {
  private formatLog(level: LogLevel, message: string, context?: Record<string, unknown>): LogPayload {
    return {
      level,
      message,
      context,
      timestamp: new Date().toISOString(),
    };
  }

  debug(message: string, context?: Record<string, unknown>) {
    if (process.env.NODE_ENV !== "production") {
      console.debug(`[DEBUG] ${message}`, context || "");
    }
  }

  info(message: string, context?: Record<string, unknown>) {
    console.info(`[INFO] ${message}`, context || "");
  }

  warn(message: string, context?: Record<string, unknown>) {
    console.warn(`[WARN] ${message}`, context || "");
  }

  error(message: string, error?: unknown, context?: Record<string, unknown>) {
    console.error(`[ERROR] ${message}`, {
      ...(context || {}),
      error: error instanceof Error ? { message: error.message, stack: error.stack } : error,
    });
  }
}

export const logger = new AppLogger();
