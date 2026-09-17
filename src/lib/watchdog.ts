/**
 * Race a promise against a deadline. When something upstream (pooler, socket,
 * third-party API) stalls, we want a named error in seconds, not a 300 s timeout.
 */
export async function withDeadline<T>(label: string, p: Promise<T>, ms = 10_000): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const deadline = new Promise<never>((_, rej) => {
    timer = setTimeout(() => rej(new Error(`[watchdog] "${label}" exceeded ${ms}ms`)), ms);
  });
  try {
    return await Promise.race([p, deadline]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}
