// services/triggerService.js
import { loadPrompt, sendPromptToGPT } from './promptService.js';
import { getTimezoneFromNumber, extractDelayMinutes } from '../utils/timeUtils.js';
import { scheduleReminder } from '../modulos/reminderManager.js';
import { CONVERSATIONS, MAIN_BOT_NUMBER } from '../config/constants.js';

export async function checkTriggerInText(text) {
  const prompt = `
Analise o texto abaixo e diga se o usuário quer ativar: "evento", "tarefa", "lembrete" ou "financiamento".
Responda apenas com uma dessas palavras, ou "nenhum" se não encontrar nada.

Texto:
"""${text}"""
  `;

  const result = await sendPromptToGPT(
    'Você é um classificador de intenções.',
    prompt
  );

  return result.toLowerCase();
}

export async function handleTriggerWithConversation(triggerName, session, message, inputText) {
  const client = session.client;
  const sender = message.from;

  const prompt = loadPrompt(triggerName);
  const gptResponse = await sendPromptToGPT(prompt, inputText);

  const convoKey = `${session.myNumber}:${sender}`;
  const history = [
    { role: 'system', content: prompt },
    { role: 'user', content: inputText },
    { role: 'assistant', content: gptResponse }
  ];

  // gatilho especial: lembrete
  if (triggerName === 'lembrete' && message.to === MAIN_BOT_NUMBER) {
    try {
      const json = JSON.parse(gptResponse);
      const tz = getTimezoneFromNumber(sender.replace('@c.us', ''));
      const { delayMinutos, descricaoOriginal, jaPassou } = extractDelayMinutes(inputText, sender, tz);

      if (jaPassou || !json.delayMinutos || !json.detalhes) {
        CONVERSATIONS.set(convoKey, {
          history,
          activeTrigger: 'lembrete',
          lembreteDraft: json
        });

        let msg = '';
        if (jaPassou) msg = `⏰ O horário "${descricaoOriginal}" já passou. Em quantos minutos você quer o lembrete?`;
        else if (!json.delayMinutos) msg = `Quantos minutos até o lembrete: "${json.conteudo}"?`;
        else msg = `Deseja adicionar mais detalhes ao lembrete: "${json.conteudo}"?`;

        await client.sendText(sender, msg);
        return;
      }

      const finalMsg = `🔔 Lembrete: ${json.conteudo}\n${json.detalhes ? '📝 ' + json.detalhes : ''}`;
      const delayMs = delayMinutos * 60 * 1000;

      scheduleReminder(session.sessionName, sender, finalMsg, delayMs, client.sendText.bind(client));

      if (delayMinutos > 10) {
        scheduleReminder(
          session.sessionName,
          sender,
          `⏳ Faltam 5 minutos para: ${json.conteudo}`,
          delayMs - 5 * 60 * 1000,
          client.sendText.bind(client)
        );
      }

      CONVERSATIONS.set(convoKey, { history: [], activeTrigger: null });
      await client.sendText(sender, `✅ Lembrete agendado para daqui a *${descricaoOriginal}*.`);
    } catch (err) {
      await client.sendText(sender, '⚠️ Não entendi o lembrete. Tente reformular.');
    }
    return;
  }

  await client.sendText(sender, `💬 *${triggerName} detectado:*\n${gptResponse}`);
  CONVERSATIONS.set(convoKey, { history, activeTrigger: triggerName });
}

export async function processText(sessionName, message, email) {
  const { SESSIONS, TRIGGERS, prompt_qualification } = await import('../config/constants.js');
  const session = SESSIONS.get(sessionName);
  const client = session?.client;
  const myNumber = session?.myNumber;
  const text = message.body?.trim();

  if (!session || !client || !text || message.from === myNumber) return;

  const lowerText = text.toLowerCase();
  const convoKey = `${myNumber}:${message.from}`;
  const stored = CONVERSATIONS.get(convoKey);

  if (lowerText === 'tbvoff') {
    CONVERSATIONS.set(convoKey, { history: [], activeTrigger: null });
    await client.sendText(message.from, '🔕 Bot desativado. Você voltou ao fluxo normal.');
    return;
  }

  if (stored?.activeTrigger && TRIGGERS[stored.activeTrigger]) {
    await TRIGGERS[stored.activeTrigger](session, message, text);
    return;
  }

  const trigger = await checkTriggerInText(text);
  if (trigger !== 'nenhum' && TRIGGERS[trigger]) {
    await TRIGGERS[trigger](session, message, text);
    return;
  }

  if (!lowerText.includes('@broker') && !stored?.history?.length) return;

  if (!stored?.history?.length) {
    CONVERSATIONS.set(convoKey, {
      history: [{ role: 'system', content: prompt_qualification }],
      activeTrigger: null
    });
  }

  const updated = CONVERSATIONS.get(convoKey);
  updated.history.push({ role: 'user', content: text });

  const { default: OpenAI } = await import('openai');
  const openai = new OpenAI({ apiKey: OPENAI_API_KEY });

  const resp = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: updated.history
  });

  const reply = resp.choices[0].message.content.trim();
  updated.history.push({ role: 'assistant', content: reply });
  await client.sendText(message.from, reply);
}
