type Level = 'debug' | 'info' | 'warn' | 'error'

type Context = Record<string, unknown>

// Maps level → console method
const consoleFn: Record<Level, (...args: unknown[]) => void> = {
  debug: console.debug,
  info:  console.info,
  warn:  console.warn,
  error: console.error,
}

const LEVELS: Record<Level, number> = { debug: 10, info: 20, warn: 30, error: 40 }

const isDev = process.env.NODE_ENV !== 'production'
const minLevel: number = isDev ? LEVELS.debug : LEVELS.info

function makeLogger(baseCtx: Context = {}) {
  function log(level: Level, msgOrCtx: string | Context, maybeMsg?: string) {
    if (LEVELS[level] < minLevel) return

    // Overloads: log('info', 'message') or log('info', { key }, 'message')
    const [ctx, message] =
      typeof msgOrCtx === 'string'
        ? [baseCtx, msgOrCtx]
        : [{ ...baseCtx, ...msgOrCtx }, maybeMsg ?? '']

    if (isDev) {
      // Human-readable output in development
      const prefix = `[${level.toUpperCase()}]`
      const extra = Object.keys(ctx).length ? ctx : undefined
      extra
        ? consoleFn[level](prefix, message, extra)
        : consoleFn[level](prefix, message)
    } else {
      // Structured JSON for Cloud Logging — fields match the constitution requirement:
      // severity, message, timestamp + any context (tenant_id, instance_id, trace_id…)
      consoleFn[level](
        JSON.stringify({
          severity: level.toUpperCase(),
          message,
          timestamp: new Date().toISOString(),
          ...ctx,
        }),
      )
    }
  }

  return {
    debug: (msgOrCtx: string | Context, msg?: string) => log('debug', msgOrCtx, msg),
    info:  (msgOrCtx: string | Context, msg?: string) => log('info',  msgOrCtx, msg),
    warn:  (msgOrCtx: string | Context, msg?: string) => log('warn',  msgOrCtx, msg),
    error: (msgOrCtx: string | Context, msg?: string) => log('error', msgOrCtx, msg),
    child: (childCtx: Context) => makeLogger({ ...baseCtx, ...childCtx }),
  }
}

export const logger = makeLogger()

export function createRequestLogger(context: {
  tenant_id?: string
  instance_id?: string
  trace_id?: string
}) {
  return logger.child(context)
}
