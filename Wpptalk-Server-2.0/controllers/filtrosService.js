// services/filtrosService.js
import fs from 'fs';
import path from 'path';
import { SESSION_FILTERS } from '../config/constants.js';
import { pool } from '../db/index.js';

const filtersFile = '/root/wpptalk_server/tokens/filters/filters.json';
const sessionsFile = '/root/wpptalk_server/tokens/sessions_logs/sessions.json';

export async function getBlockedNumbersFromDB(email, sessionName) {
  const [rows] = await pool.query(
    `SELECT valor 
     FROM filtros 
     WHERE email = ? AND sessao_numero = ? AND filtro_nome = 'blockedNumbers'`,
    [email, sessionName]
  );
  return rows.map(r => r.valor);
}

export async function deleteBlockedNumberFromDB(email, sessionName, remove) {
  const [result] = await pool.execute(
    `DELETE FROM filtros
     WHERE email = ? AND sessao_numero = ? AND filtro_nome = 'blockedNumbers' AND valor = ?`,
    [email, sessionName, String(remove)]
  );
  return result.affectedRows > 0;
}

export async function saveSessionFilters(sessionName, email, incomingFilters) {
  const conn = await pool.getConnection();

  const { blockedNumbers, ...others } = incomingFilters;

  const current = SESSION_FILTERS.get(sessionName) || {};
  const updated = {
    ...current,
    ...others,
  };

  SESSION_FILTERS.set(sessionName, updated);

  try {
    await conn.execute(
      `DELETE FROM filtros WHERE email = ? AND sessao_numero = ? AND filtro_nome <> 'blockedNumbers'`,
      [email, sessionName]
    );

    const rows = Object.entries(updated).map(([key, val]) => {
      let value;
      if (typeof val === 'boolean') value = val ? '1' : '0';
      else if (typeof val === 'string') value = val;
      else value = JSON.stringify(val);
      return [email, sessionName, key, value];
    });

    if (rows.length > 0) {
      await conn.query(
        `INSERT INTO filtros (email, sessao_numero, filtro_nome, valor) VALUES ?`,
        [rows]
      );
    }

    return { message: 'Filtros atualizados com sucesso.' };
  } finally {
    conn.release();
  }
}

export async function addBlockedNumbersFromStaticFiles(email, number) {
  const sessions = JSON.parse(fs.readFileSync(sessionsFile, 'utf8'));
  if (sessions[number] !== email) {
    throw new Error('Email não corresponde ao número informado.');
  }

  const filters = JSON.parse(fs.readFileSync(filtersFile, 'utf8'));
  const userFilters = filters[number];
  if (!userFilters || !userFilters.blockedNumbers) {
    throw new Error('Nenhum número bloqueado encontrado.');
  }

  return userFilters.blockedNumbers.map(num => num.replace('@c.us', ''));
}
