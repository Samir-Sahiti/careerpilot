type LogLevel = "info" | "warn" | "error";

interface LogContext {
  route?: string;
  userId?: string;
  [key: string]: unknown;
}

function log(level: LogLevel, message: string, context?: LogContext, error?: unknown) {
  const entry: Record<string, unknown> = {
    timestamp: new Date().toISOString(),
    level,
    message,
    ...context,
  };

  if (error instanceof Error) {
    entry.errorMessage = error.message;
    entry.stack = error.stack;
  } else if (error !== undefined) {
    entry.error = String(error);
  }

  const output = JSON.stringify(entry);
  if (level === "error") {
    console.error(output);
  } else if (level === "warn") {
    console.warn(output);
  } else {
    console.log(output);
  }
}

export const logger = {
  info: (message: string, context?: LogContext) => log("info", message, context),
  warn: (message: string, context?: LogContext) => log("warn", message, context),
  error: (message: string, context?: LogContext, error?: unknown) =>
    log("error", message, context, error),
};
