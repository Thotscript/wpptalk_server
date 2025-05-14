// utils/websocket.js
import WebSocket from 'ws';

const sessionClients = new Map(); // sessionName => ws
let wss = null;

export function setupWebSocket(server) {
  wss = new WebSocket.Server({ server });

  wss.on('connection', (ws) => {
    ws.on('message', (message) => {
      try {
        const data = JSON.parse(message);
        if (data.type === 'requestQR' && data.sessionName) {
          sessionClients.set(data.sessionName, ws);
          console.log(`🔗 Cliente escutando sessão: ${data.sessionName}`);
          broadcastQR(data.sessionName);
        }
      } catch (err) {
        console.error('❌ Erro ao processar WebSocket:', err);
      }
    });

    ws.on('close', () => {
      for (const [sessionName, clientWs] of sessionClients.entries()) {
        if (clientWs === ws) {
          sessionClients.delete(sessionName);
          console.log(`❌ Cliente da sessão ${sessionName} desconectado`);
        }
      }
    });
  });
}

export function sendToSession(sessionName, payload) {
  const client = sessionClients.get(sessionName);
  if (client && client.readyState === WebSocket.OPEN) {
    client.send(JSON.stringify(payload));
  }
}

export function broadcastQR(sessionName) {
  if (!wss) return;
  const qrPath = `/qrcodes/qrcode_${sessionName}.png?t=${Date.now()}`;
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify({ type: 'qr', sessionName, qrPath }));
    }
  });
}

export function broadcastSessionAuthenticated(sessionName) {
  if (!wss) return;
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify({ type: 'authenticated', sessionName }));
    }
  });
}
