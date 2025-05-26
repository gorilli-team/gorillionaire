const WebSocket = require("ws");
const http = require("http");
const url = require("url");

// Map to store clients and their subscriptions
const clients = new Map();

// Initialize WebSocket server
function initWebSocketServer(server) {
  const wss = new WebSocket.Server({ server });

  wss.on("connection", (ws, req) => {
    const pathname = url.parse(req.url).pathname;
    // Extract token name from URL path
    // Expected format: /events/token/TokenName or /events/notifications
    const pathParts = pathname.split("/");
    if (
      pathParts.length >= 4 &&
      pathParts[1] === "events" &&
      pathParts[2] === "token"
    ) {
      const tokenName = pathParts[3];

      // Store client with token subscription
      clients.set(ws, { tokenName });

      // Send confirmation message
      ws.send(
        JSON.stringify({
          type: "CONNECTION_ESTABLISHED",
          message: `Subscribed to ${tokenName} events`,
          timestamp: new Date().toISOString(),
        })
      );
    } else if (pathname === "/events/notifications") {
      // Store client with notifications subscription
      clients.set(ws, { notifications: true });

      // Send confirmation message
      ws.send(
        JSON.stringify({
          type: "CONNECTION_ESTABLISHED",
          message: "Subscribed to notifications",
          timestamp: new Date().toISOString(),
        })
      );
    } else {
      ws.send(
        JSON.stringify({
          type: "ERROR",
          message: "Invalid subscription path",
          timestamp: new Date().toISOString(),
        })
      );
    }

    // Handle client messages
    ws.on("message", (message) => {
      try {
        const data = JSON.parse(message);

        // Handle ping/pong for keeping connection alive
        if (data.type === "PING") {
          ws.send(
            JSON.stringify({
              type: "PONG",
              timestamp: new Date().toISOString(),
            })
          );
        }
      } catch (error) {
        console.error("Error processing message:", error);
      }
    });

    // Handle client disconnect
    ws.on("close", () => {
      clients.delete(ws);
    });

    // Handle errors
    ws.on("error", (error) => {
      console.error("WebSocket error:", error);
      clients.delete(ws);
    });
  });

  // Heartbeat to detect dead connections
  setInterval(() => {
    wss.clients.forEach((ws) => {
      if (ws.isAlive === false) {
        clients.delete(ws);
        return ws.terminate();
      }

      ws.isAlive = false;
      ws.ping();
    });
  }, 30000);

  return wss;
}

// Function to broadcast event to subscribed clients
function broadcastEvent(tokenName, event) {
  let recipientCount = 0;

  clients.forEach((client, ws) => {
    if (ws.readyState === WebSocket.OPEN && client.tokenName === tokenName) {
      ws.send(
        JSON.stringify({
          type: "NEW_EVENT",
          data: event,
          timestamp: new Date().toISOString(),
        })
      );
      recipientCount++;
    }
  });
}

// Function to broadcast notifications to subscribed clients
function broadcastNotification(notification) {
  let recipientCount = 0;

  clients.forEach((client, ws) => {
    if (ws.readyState === WebSocket.OPEN && client.notifications) {
      ws.send(
        JSON.stringify({
          type: "NOTIFICATION",
          data: notification,
          timestamp: new Date().toISOString(),
        })
      );
      recipientCount++;
    }
  });
}

module.exports = {
  initWebSocketServer,
  broadcastEvent,
  broadcastNotification,
};
