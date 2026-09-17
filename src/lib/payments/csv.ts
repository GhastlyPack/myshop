/** Tiny CSV streamer for the export route handlers. RFC 4180 quoting, UTF-8 BOM for Excel. */
export function csvCell(v: unknown): string {
  if (v === null || v === undefined) return "";
  const s = v instanceof Date ? v.toISOString() : Array.isArray(v) ? v.join("; ") : String(v);
  // Neutralise spreadsheet formula injection, then quote.
  const safe = /^[=+\-@\t\r]/.test(s) ? `'${s}` : s;
  return /[",\r\n]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
}

export function csvLine(cells: unknown[]) {
  return cells.map(csvCell).join(",") + "\r\n";
}

/**
 * Build a streaming CSV Response. `rows` is pulled lazily so exports of large
 * stores never buffer everything in memory.
 */
export function csvResponse(filename: string, header: string[], rows: AsyncIterable<unknown[]>): Response {
  const enc = new TextEncoder();
  const it = rows[Symbol.asyncIterator]();
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      controller.enqueue(enc.encode("﻿" + csvLine(header)));
    },
    async pull(controller) {
      const { value, done } = await it.next();
      if (done) {
        controller.close();
        return;
      }
      controller.enqueue(enc.encode(csvLine(value)));
    },
    cancel() {
      void it.return?.();
    },
  });
  return new Response(stream, {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="${filename.replace(/[^a-z0-9._-]/gi, "_")}"`,
      "cache-control": "no-store",
    },
  });
}

/** Page through a query in batches and yield rows one at a time. */
export async function* paged<T>(fetchPage: (offset: number, limit: number) => Promise<T[]>, limit = 500): AsyncGenerator<T> {
  let offset = 0;
  for (;;) {
    const page = await fetchPage(offset, limit);
    for (const row of page) yield row;
    if (page.length < limit) return;
    offset += limit;
  }
}
