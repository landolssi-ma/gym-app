type Fields = Record<string, unknown>
type LogFn = (msg: string, fields?: Fields) => void
export type Log = { info: LogFn; warn: LogFn; error: LogFn }

// One JSON line per event for Workers Logs. Callers never pass secrets or emails.
export function createLog(base: Fields = {}): Log {
  const write = (level: string): LogFn => (msg, fields = {}) =>
    console.log(
      JSON.stringify({ level, msg, ts: new Date().toISOString(), ...base, ...fields }, (_k, v) =>
        // The replacer re-runs on whatever it returns (including a nested Error `cause`), so a
        // cause chain unwraps on its own without manual recursion here.
        v instanceof Error ? { name: v.name, message: v.message, stack: v.stack, ...(v.cause !== undefined && { cause: v.cause }) } : v,
      ),
    )
  return { info: write("info"), warn: write("warn"), error: write("error") }
}
