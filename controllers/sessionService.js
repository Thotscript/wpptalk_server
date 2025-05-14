// services/sessionService.js
import path from 'path';
import fs from 'fs';
import wppconnect from '@wppconnect-team/wppconnect';
import { criarOuIgnorarUsuario, criarOuIgnorarSessao, excluirSessaoPorEmail } from '../db/usuarios.js';
import { insertDefaultFilters } from '../db/default-filter.js';
import { fileURLToPath } from 'url';
import { SESSIONS, TOKEN_DIR, myTokenStore, SESSION_LOGS_DIR } from '../config/constants.js';
import { myTokenStore, SESSIONS } from '../config/constants.js';
import { cleanupSession } from '../utils/fileUtils.js';
import wppconnect from '@wppconnect-team/wppconnect';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export async function createSession(sessionName, email, res) {
  if (SESSIONS.has(sessionName)) {
    return { message: `Sessão ${sessionName} já autenticada.` };
  }

  const sessionPath = path.join(TOKEN_DIR, sessionName);
  if (!fs.existsSync(sessionPath)) fs.mkdirSync(sessionPath, { recursive: true });

  let responseSent = false;

  const client = await wppconnect.create({
    session: sessionName,
    tokenStore: myTokenStore,
    deviceName: 'The Broker VIP',
    catchQR: async (base64Qr) => {
      const { saveQRCode } = await import('../utils/fileUtils.js');
      const qrFilePath = await saveQRCode(base64Qr, sessionName);
      const qrCodeURL = `https://verbai.com.br:8443/qrcodes/${path.basename(qrFilePath)}`;
      if (!responseSent) {
        responseSent = true;
        res.json({ qrCodeFile: qrCodeURL });
      }
    },
    debug: true,
    headless: true,
    puppeteerOptions: {
      userDataDir: sessionPath,
      args: ['--no-sandbox']
    }
  });

  SESSIONS.set(sessionName, {
    client,
    email,
    myNumber: null
  });

  await criarOuIgnorarUsuario(email);
  return { message: `Sessão ${sessionName} criada.` };
}

export async function destroySession(sessionName, email) {
  const session = SESSIONS.get(sessionName);
  if (session) {
    try {
      await session.client.logout();
      await session.client.close();
    } catch (err) {
      console.warn('Erro ao encerrar client:', err);
    }
    SESSIONS.delete(sessionName);
  }

  const qrPath = path.join(__dirname, '..', 'public', 'qrcodes', `qrcode_${sessionName}.png`);
  if (fs.existsSync(qrPath)) fs.unlinkSync(qrPath);

  const sessionPath = path.join(TOKEN_DIR, sessionName);
  if (fs.existsSync(sessionPath)) fs.rmSync(sessionPath, { recursive: true, force: true });

  await excluirSessaoPorEmail(email, sessionName);
}

export async function findSessionsByEmail(email) {
  const { pool } = await import('../db/index.js');

  const [rows] = await pool.query(
    `SELECT s.numero, COALESCE(MAX(l.ultimo_acesso), 'no activity') AS ultimo_acesso
     FROM sessoes s
     LEFT JOIN logs_sessao l ON l.sessao_numero = s.numero
     WHERE s.usuario_email = ?
     GROUP BY s.numero
     ORDER BY MAX(l.ultimo_acesso) DESC`,
    [email]
  );

  return rows;
}

export async function findLastSessionByEmail(email) {
  const { pool } = await import('../db/index.js');

  const [rows] = await pool.query(
    `SELECT sessao_numero AS numero, ultimo_acesso
     FROM logs_sessao
     WHERE email = ?
     ORDER BY ultimo_acesso DESC
     LIMIT 1`,
    [email]
  );

  return rows[0] || null;
}

const RESTARTING_SESSIONS = new Set();

export function restartSessionIfOffline(sessionName, email) {
  if (RESTARTING_SESSIONS.has(sessionName)) return;
  RESTARTING_SESSIONS.add(sessionName);

  setTimeout(async () => {
    try {
      console.log(`🔁 Reiniciando sessão ${sessionName} após estado OFFLINE...`);
      await cleanupSession(sessionName);
      await restoreSession({ sessionName, email });
    } catch (err) {
      console.error(`❌ Falha ao restaurar sessão ${sessionName}:`, err);
    } finally {
      RESTARTING_SESSIONS.delete(sessionName);
    }
  }, 2000);
}

export async function restoreSessions() {
  const { pool } = await import('../db/index.js');

  try {
    const [rows] = await pool.query(`
      SELECT numero AS sessionName, usuario_email AS email
      FROM sessoes
    `);

    if (rows.length === 0) {
      console.log('Nenhuma sessão encontrada no banco para restaurar.');
      return;
    }

    const queue = rows.filter(({ sessionName }) => !SESSIONS.has(sessionName));
    if (queue.length === 0) {
      console.log('⚠️ Todas as sessões já estão ativas.');
      return;
    }

    const MAX_CONCURRENT = 3;
    let active = 0;
    let index = 0;

    const processBatch = async () => {
      while (index < queue.length && active < MAX_CONCURRENT) {
        const session = queue[index++];
        active++;

        restoreSession(session).finally(() => {
          active--;
          if (index < queue.length) processBatch();
        });
      }
    };

    await processBatch();
  } catch (err) {
    console.error('❌ Erro ao consultar sessões:', err);
  }
}

export async function restoreSession({ sessionName, email }) {
  const path = (await import('path')).default;
  const sessionPath = path.join('/root/wpptalk_server/tokens', sessionName);
  const fs = await import('fs');

  try {
    const lockPath = path.join(sessionPath, 'SingletonLock');
    if (fs.existsSync(lockPath)) {
      fs.unlinkSync(lockPath);
      console.log(`🔓 Removido SingletonLock de ${sessionName}`);
    }

    const tokenData = await myTokenStore.getToken(sessionName);
    if (!tokenData) {
      console.warn(`⚠️ Token não encontrado para ${sessionName}`);
      return;
    }

    const client = await wppconnect.create({
      session: sessionName,
      tokenStore: myTokenStore,
      deviceName: 'The Broker VIP',
      headless: true,
      debug: true,
      puppeteerOptions: {
        userDataDir: sessionPath,
        args: ['--no-sandbox']
      }
    });

    SESSIONS.set(sessionName, { client, email, myNumber: null });

    const { criarOuIgnorarUsuario } = await import('../db/usuarios.js');
    await criarOuIgnorarUsuario(email);

    try {
      const myNumber = await client.getWid();
      SESSIONS.get(sessionName).myNumber = myNumber;
      console.log(`✅ ${sessionName} restaurada: ${myNumber}`);
    } catch (err) {
      console.warn(`⚠️ Não foi possível obter myNumber: ${err.message}`);
    }

    // Eventos padrão
    client.onStateChange(async (state) => {
      console.log(`Estado da sessão ${sessionName}: ${state}`);

      if (state === 'CONNECTED') {
        const { criarOuIgnorarSessao } = await import('../db/sessions.js');
        await criarOuIgnorarSessao(sessionName, email);
      } else if (['DISCONNECTED', 'CLOSE', 'UNPAIRED', 'CONFLICT'].includes(state)) {
        console.warn(`⚠️ Sessão ${sessionName} em estado crítico (${state}), limpando...`);
        await cleanupSession(sessionName);
      } else if (state === 'OFFLINE') {
        restartSessionIfOffline(sessionName, email);
      }
    });

    client.onAnyMessage(async (message) => {
      const { processAudio } = await import('./audioService.js');
      const { processText } = await import('./triggerService.js');
      const { loadFiltersFromDB } = await import('./filtrosService.js');

      const filters = await loadFiltersFromDB(email, sessionName);
      const blocked = filters.blockedNumbers || [];

      if (filters.ignoreGroups && message.isGroupMsg) return;
      if (blocked.includes(message.from)) return;

      if (message.type === 'ptt' || message.type === 'audio') {
        await processAudio(sessionName, message);
      }

      if (message.type === 'chat') {
        await processText(sessionName, message, email);
      }
    });

  } catch (err) {
    console.error(`❌ Erro ao restaurar sessão ${sessionName}:`, err.message);
  }
}
