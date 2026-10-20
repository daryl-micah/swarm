export function sse(run: (send: (event: string, data: unknown) => void) => Promise<void>, onEnd?: () => void) {
  const enc = new TextEncoder();
  const stream = new ReadableStream({
    async start(c) {
      const send = (event: string, data: unknown) =>
        c.enqueue(enc.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`));
      try {
        await run(send);
      } catch (e: any) {
        send("error", { message: String(e?.message ?? e) });
      }
      onEnd?.();
      c.close();
    },
  });
  return new Response(stream, { headers: { "content-type": "text/event-stream", "cache-control": "no-cache" } });
}
