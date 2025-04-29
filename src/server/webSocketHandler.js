const WebSocket = require('ws');

function setupWebSocketServer(port, onMessageCallback) {
  const wss = new WebSocket.Server({ port });

  wss.on('connection', (ws) => {
    console.log('WebSocket client connected');

    ws.on('message', (message) => {
      console.log('Message from WebSocket client:', message);
      if (onMessageCallback) {
        onMessageCallback(message); // Pass the message to the callback
      }
    });

    ws.on('close', () => {
      console.log('WebSocket client disconnected');
    });
  });

  console.log(`WebSocket server running on ws://localhost:${port}`);
  return wss;
}

function broadcastMessage(wss, message) {
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      console.log('Sending to WebSocket client:', message);
      client.send(message);
    }
  });
}

module.exports = { setupWebSocketServer, broadcastMessage };