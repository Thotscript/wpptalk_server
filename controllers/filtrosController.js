// controllers/filtrosController.js
import {
  getBlockedNumbersFromDB,
  deleteBlockedNumberFromDB,
  addBlockedNumbersFromStaticFiles,
  saveSessionFilters
} from '../services/filtrosService.js';

export async function getBlockedNumbers(req, res) {
  const { email, sessionName } = req.query;
  if (!email || !sessionName) {
    return res.status(400).json({ message: 'Parâmetros email e sessionName são obrigatórios' });
  }

  try {
    const blocked = await getBlockedNumbersFromDB(email, sessionName);
    res.json({ [sessionName]: blocked });
  } catch (err) {
    console.error('Erro ao buscar blockedNumbers:', err);
    res.status(500).json({ message: 'Erro interno do servidor' });
  }
}

export async function deleteBlockedNumber(req, res) {
  const { email, sessionName, remove } = req.body;
  if (!email || !sessionName || !remove) {
    return res.status(400).json({ message: 'Parâmetros email, sessionName e remove são obrigatórios' });
  }

  try {
    const removed = await deleteBlockedNumberFromDB(email, sessionName, remove);
    if (!removed) {
      return res.status(404).json({ message: 'Número não encontrado na lista de blockedNumbers' });
    }

    res.json({ success: true, message: `Número ${remove} removido com sucesso.` });
  } catch (err) {
    console.error('Erro ao remover blockedNumber:', err);
    res.status(500).json({ message: 'Erro interno ao remover número bloqueado' });
  }
}

export async function saveFilters(req, res) {
  const { sessionName, email, ...filters } = req.body;

  if (!sessionName || !email) {
    return res.status(400).json({ message: 'sessionName e email são obrigatórios.' });
  }

  try {
    const result = await saveSessionFilters(sessionName, email, filters);
    res.json(result);
  } catch (err) {
    console.error('Erro ao salvar filtros:', err);
    res.status(500).json({ message: 'Erro interno ao salvar filtros' });
  }
}

export async function getBlockedFromStaticFiles(req, res) {
  const { email, number } = req.body;
  if (!email || !number) {
    return res.status(400).json({ error: 'Email e número são obrigatórios.' });
  }

  try {
    const blocked = await addBlockedNumbersFromStaticFiles(email, number);
    res.json({ blockedNumbers: blocked });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao processar a requisição', details: err.message });
  }
}
