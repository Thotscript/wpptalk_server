// services/promptService.js
import fs from 'fs';
import path from 'path';
import axios from 'axios';
import { fileURLToPath } from 'url';
import { OPENAI_API_KEY } from '../config/env.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export function loadPrompt(promptName) {
  const promptPath = path.join(__dirname, '..', 'prompts', `${promptName}.txt`);
  return fs.readFileSync(promptPath, 'utf8');
}

export async function sendPromptToGPT(systemPrompt, userText, model = 'gpt-4o-mini') {
  const response = await axios.post('https://api.openai.com/v1/chat/completions', {
    model,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userText }
    ]
  }, {
    headers: {
      Authorization: `Bearer ${OPENAI_API_KEY}`,
      'Content-Type': 'application/json'
    }
  });

  return response.data.choices[0].message.content.trim();
}
