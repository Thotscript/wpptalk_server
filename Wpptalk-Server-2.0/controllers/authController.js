// controllers/authController.js
import {
  createSession,
  destroySession,
  findSessionsByEmail,
  findLastSessionByEmail
} from '../services/sessionService.js';

export async function loginSession(req, res) {
  const { sessionName, email } = req.body;

  if (!sessionName || !email) {
    return res.status(400).json({ message: 'sessionName e email são obrigatórios' });
  }

  try {
    const result = await createSession(sessionName, email, res);
    if (result) res.json(result);
  } catch (err) {
    console.error('Erro ao criar sessão:', err);
    if (!res.headersSent) {
      res.status(500).json({ message: 'Erro ao iniciar sessão' });
    }
  }
}

export async function logoutSession(req, res) {
  const { sessionName, email } = req.query;
  if (!sessionName || !email) {
    return res.status(400).json({ error: 'sessionName e email são obrigatórios' });
  }

  try {
    await destroySession(sessionName, email);
    res.status(200).json({ message: 'Sessão finalizada com sucesso' });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao finalizar sessão' });
  }
}

export async function getStatusDevices(req, res) {
  const { email } = req.query;
  if (!email) return res.status(400).json({ error: 'Email é obrigatório.' });

  try {
    const result = await findSessionsByEmail(email);
    if (result.length === 0) {
      return res.status(404).json({ error: 'Nenhum número encontrado para este email.' });
    }

    res.json({ logs: result });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao acessar o banco de dados.' });
  }
}

export async function getStatusFinder(req, res) {
  const { email } = req.query;
  if (!email) return res.status(400).json({ error: 'Email é obrigatório.' });

  try {
    const result = await findLastSessionByEmail(email);
    if (!result) {
      return res.status(404).json({ error: 'Nenhum registro encontrado para este email.' });
    }

    res.json({ log: result });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao acessar o banco de dados.' });
  }
}

export async function getPreferenceNumbers(req, res) {
  const { email } = req.query;
  if (!email) return res.status(400).json({ message: 'O envio do email é obrigatório' });

  try {
    const { pool } = await import('../db/index.js');
    const [rows] = await pool.query(
      'SELECT numero FROM sessoes WHERE usuario_email = ?',
      [email]
    );

    const numeros = rows.map(row => row.numero);
    res.json({ [email]: numeros });
  } catch (err) {
    res.status(500).json({ message: 'Erro interno do servidor' });
  }
}
