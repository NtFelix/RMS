// Mock WebSocket implementation for server-side rendering
class WebSocket {
  constructor() {
    // Mock WebSocket methods
    this.send = () => {};
    this.close = () => {};
    this.onopen = () => {};
    this.onclose = () => {};
    this.onmessage = () => {};
    this.onerror = () => {};
  }
  
  // Static properties to match the WebSocket API
  static get CONNECTING() { return 0; }
  static get OPEN() { return 1; }
  static get CLOSING() { return 2; }
  static get CLOSED() { return 3; }
}

// Export the WebSocket class as default
module.exports = WebSocket;

// Also export as a named export for compatibility
module.exports.WebSocket = WebSocket;

// Export WebSocketServer function
module.exports.WebSocketServer = function() {
  return {
    // Mock WebSocket server methods
    on: () => {},
    close: () => {},
  };
};

// Export for ES modules
module.exports.default = WebSocket;
