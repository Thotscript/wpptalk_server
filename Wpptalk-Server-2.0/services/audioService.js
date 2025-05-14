// services/audioService.js
import fs from 'fs';
import path from 'path';
import axios from 'axios';
import FormData from 'form-data';
import { spawn } from 'child_process';
import { getAudioDurationInSeconds } from '../utils/audioUtils.js';
import { checkTriggerInText, handleTriggerWithConversation } from './triggerService.js';
import { SESSIONS } from '../config/constants.js';

export async function processAudio(sessionName, message) {
  const session = SESSIONS.get(sessionName);
  const { client, email, myNumber } = session;
  const buffer = await client.decryptFile(message);

  const temp = path.join('audios', `${message.id}.ogg`);
  fs.writeFileSync(temp, buffer);

  const transcription = await transcribeAudio(temp);
  const trigger = await checkTriggerInText(transcription);

  if (trigger !== 'nenhum') {
    await handleTriggerWithConversation(trigger, session, message, transcription);
    fs.unlinkSync(temp);
    return;
  }

  await client.sendText(message.from, `📝 Transcrição:\n${transcription}`);
  fs.unlinkSync(temp);
}

export async function transcribeAudio(filepath) {
  const formData = new FormData();
  formData.append('file', fs.createReadStream(filepath));
  formData.append('model', 'whisper-1');

  const result = await axios.post('https://api.openai.com/v1/audio/transcriptions', formData, {
    headers: {
      ...formData.getHeaders(),
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`
    }
  });

  return result.data.text;
}
