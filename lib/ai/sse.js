export function formatSseEvent(event, data) {
  return `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
}

export function createSseStream() {
  const encoder = new TextEncoder();
  let controllerRef = null;

  const stream = new ReadableStream({
    start(controller) {
      controllerRef = controller;
    },
  });

  return {
    stream,
    send(event, data) {
      if (controllerRef) {
        controllerRef.enqueue(encoder.encode(formatSseEvent(event, data)));
      }
    },
    close() {
      if (controllerRef) {
        controllerRef.close();
      }
    },
  };
}
