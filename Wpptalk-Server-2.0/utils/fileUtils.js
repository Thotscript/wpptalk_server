// utils/fileUtils.js
import fs from 'fs';
import path from 'path';
import { SESSIONS, TOKEN_DIR } from '../config/constants.js';

export async function cleanupSession(sessionName) {
  const session = SESSIONS.get(sessionName);
  if (session?.client) {
    try {
      await session.client.logout();
      await session.client.close();
    } catch (err) {
      console.warn(`Erro ao encerrar sessão ${sessionName}:`, err.message);
    }
  }

  SESSIONS.delete(sessionName);
  console.log(`🔴 Sessão ${sessionName} encerrada.`);

  const qrPath = path.join(process.cwd(), 'public', 'qrcodes', `qrcode_${sessionName}.png`);
  if (fs.existsSync(qrPath)) fs.unlinkSync(qrPath);

  const sessionPath = path.join(TOKEN_DIR, sessionName);
  setTimeout(() => {
    if (fs.existsSync(sessionPath)) {
      fs.rmSync(sessionPath, { recursive: true, force: true });
      console.log(`🧹 Sessão ${sessionName} removida do sistema de arquivos.`);
    }
  }, 3000);
}
