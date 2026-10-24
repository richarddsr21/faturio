// Mock WebSocket para testes Node.js
if (typeof global.WebSocket === "undefined") {
  // Criar um mock simples de WebSocket
  class MockWebSocket {
    constructor(
      public url: string,
      public protocols?: string | string[],
    ) {}
    send() {}
    close() {}
    addEventListener() {}
    removeEventListener() {}
  }
  (globalThis as unknown as { WebSocket: unknown }).WebSocket = MockWebSocket;
}
