const TOTAL_BYTES = 1024 * 10;
const CHUNK_SIZE = 64;
const BPS = 512;

const generate = function* (totalBytes: number, chunkSize: number) {
  let remaining = totalBytes;
  while (remaining > 0) {
    const chunk = new Uint8Array(Math.min(remaining, chunkSize));
    crypto.getRandomValues(chunk);
    remaining -= chunk.length;
    yield chunk;
  }
};

Deno.serve((req: Request) => {
  const stream = new ReadableStream({
    async start(controller) {
      const generator = generate(TOTAL_BYTES, CHUNK_SIZE);
      const delay = (CHUNK_SIZE / BPS) * 1000;
      while (true) {
        const {value, done} = generator.next();
        if (done) {
          controller.close();
          break;
        }
        controller.enqueue(value);
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  });
  const headers = new Headers();
  headers.set('Access-Control-Allow-Origin', '*');
  headers.set(
    'Content-Disposition',
    `attachment; filename="${TOTAL_BYTES}.bin"`
  );
  headers.set('Content-Type', 'application/octet-stream');
  headers.set('Content-Length', String(TOTAL_BYTES));
  return new Response(stream, {
    headers
  });
});
