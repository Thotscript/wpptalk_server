// server.js
import https from 'https';
import fs from 'fs';
import dotenv from 'dotenv';
import app from './app.js';
import { options } from './config/sslOptions.js';
import { restoreSessions } from './services/sessionService.js';
import { setupWebSocket } from './utils/websocket.js';

dotenv.config();

const PORT = process.env.PORT || 8443;
const server = https.createServer(options, app);

server.listen(PORT, () => {
  console.log(`🚀 Servidor rodando na porta ${PORT}`);
  restoreSessions().then(() => {
    console.log('✔️ Sessões restauradas após inicialização.');
  });
});

setupWebSocket(server);