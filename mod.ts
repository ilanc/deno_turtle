import {serveDir} from 'https://deno.land/std@0.202.0/http/file_server.ts';

const TOTAL_BYTES = 1024 * 10;
const CHUNK_SIZE = 64;
const BPS = 512;

Deno.serve((request: Request) => {
  const url = new URL(request.url);
  if (url.pathname === '/bin') {
    return stream();
  }
  return serveDir(request, {
    fsRoot: './public',
    quiet: true
  });
});

// Random filename
const filename = () =>
  Array.from(
    {length: 12},
    () => 'abcdefghijklmnopqrstuvwxyz0123456789'[Math.floor(Math.random() * 36)]
  ).join('') + '.bin';

// Random bytes generator
const generate = function* (totalBytes: number, chunkSize: number) {
  let remaining = totalBytes;
  while (remaining > 0) {
    const chunk = new Uint8Array(Math.min(remaining, chunkSize));
    crypto.getRandomValues(chunk);
    remaining -= chunk.length;
    yield chunk;
  }
};

// ReadableStream response
const stream = () => {
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
  headers.set('access-control-allow-origin', '*');
  headers.set('access-control-expose-headers', 'content-disposition');
  headers.set('content-disposition', `attachment; filename="${filename()}"`);
  headers.set('content-type', 'application/octet-stream');
  headers.set('content-length', String(TOTAL_BYTES));
  headers.set('cache-control', 'no-store');
  return new Response(stream, {
    headers
  });
};
