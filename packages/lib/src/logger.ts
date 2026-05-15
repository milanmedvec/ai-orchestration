type LoggerArgs = Record<string, unknown>;

export type Logger = {
  debug: (message: string, args?: LoggerArgs) => void;
  info: (message: string, args?: LoggerArgs) => void;
  warn: (message: string, args?: LoggerArgs) => void;
  error: (message: string, args?: LoggerArgs & { error?: unknown }) => void;
  child: () => Logger;
};

function format(level: string, message: string, args?: LoggerArgs): string {
  const ts = new Date().toISOString();
  const rest = args && Object.keys(args).length > 0 ? ` ${JSON.stringify(args)}` : "";
  return `${ts} [${level.toUpperCase()}] ${message}${rest}`;
}

function createLogger(traceId?: string): Logger {
  function withTrace(args?: LoggerArgs): LoggerArgs | undefined {
    if (!traceId) return args;
    return args ? { ...args, traceId } : { traceId };
  }

  return {
    debug: (msg, args) => console.debug(format("debug", msg, withTrace(args))),
    info:  (msg, args) => console.info(format("info", msg, withTrace(args))),
    warn:  (msg, args) => console.warn(format("warn", msg, withTrace(args))),
    error: (msg, args) => {
      console.error(format("error", msg, withTrace(args)));
      if (args?.error) console.error(args.error);
    },
    child: () => createLogger(Math.random().toString(36).slice(2, 15)),
  };
}

export const loggerFactory = { createLogger };
