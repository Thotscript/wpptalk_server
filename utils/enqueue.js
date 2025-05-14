// utils/enqueue.js
const queues = new Map();

/**
 * Executa uma função de forma sequencial para cada sessão, evitando concorrência.
 * @param {string} sessionName
 * @param {() => Promise<void>} fn Função assíncrona a ser enfileirada
 */
export function enqueueProcessing(sessionName, fn) {
  const currentQueue = queues.get(sessionName) || Promise.resolve();

  const newQueue = currentQueue
    .then(() => fn())
    .catch(err => {
      console.error(`Erro na fila da sessão ${sessionName}:`, err);
    })
    .finally(() => {
      console.log(`✅ Processamento da fila concluído para sessão: ${sessionName}`);
    });

  queues.set(sessionName, newQueue);
}
