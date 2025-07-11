import { ReadStream } from 'fs';
import { Readable } from 'stream';

/**
 * Convert Node.js ReadStream to Web ReadableStream
 * This is needed because Next.js App Router expects Web streams
 */
export function nodeStreamToWebStream(nodeStream: ReadStream): ReadableStream<Uint8Array> {
  return new ReadableStream({
    start(controller) {
      nodeStream.on('data', (chunk: Buffer) => {
        controller.enqueue(new Uint8Array(chunk));
      });

      nodeStream.on('end', () => {
        controller.close();
      });

      nodeStream.on('error', (error) => {
        controller.error(error);
      });
    },
    cancel() {
      nodeStream.destroy();
    }
  });
}

/**
 * Convert any Node.js Readable stream to Web ReadableStream
 */
export function readableStreamToWebStream(readable: Readable): ReadableStream<Uint8Array> {
  return new ReadableStream({
    start(controller) {
      readable.on('data', (chunk: Buffer) => {
        controller.enqueue(new Uint8Array(chunk));
      });

      readable.on('end', () => {
        controller.close();
      });

      readable.on('error', (error) => {
        controller.error(error);
      });
    },
    cancel() {
      readable.destroy();
    }
  });
}