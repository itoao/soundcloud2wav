import { Readable } from 'stream';

/**
 * Convert a Node.js readable stream to a Web ReadableStream
 */
export function nodeStreamToWebStream(nodeStream: Readable): ReadableStream {
  return new ReadableStream({
    start(controller) {
      nodeStream.on('data', (chunk) => {
        controller.enqueue(chunk);
      });

      nodeStream.on('end', () => {
        controller.close();
      });

      nodeStream.on('error', (err) => {
        controller.error(err);
      });
    },
    cancel() {
      nodeStream.destroy();
    }
  });
}