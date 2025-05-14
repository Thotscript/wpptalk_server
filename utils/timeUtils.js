// utils/timeUtils.js
import { differenceInMinutes } from 'date-fns';
import * as tz from 'date-fns-tz';
import { DDI_TO_TIMEZONE } from '../config/constants.js';

export function getTimezoneFromNumber(number) {
  const clean = number.replace(/\D/g, '');
  const ddi = clean.startsWith('55') ? '55' : clean.slice(0, 3);
  return DDI_TO_TIMEZONE[ddi] || DDI_TO_TIMEZONE[ddi.slice(0, 2)] || 'UTC';
}

export function extractDelayMinutes(text, senderNumber = '', explicitTimezone = null) {
  const matchMin = text.match(/em (\d+)\s*(minutos|min|m)\b/i);
  const matchHoras = text.match(/em (\d+)\s*(horas|h)\b/i);
  const matchHoraRelogio = text.match(/(?:às|as)?\s*(\d{1,2}):?(\d{2})?\b/i);

  const timezone = explicitTimezone || getTimezoneFromNumber(senderNumber);
  const now = tz.utcToZonedTime(new Date(), timezone);

  if (matchMin) {
    const delay = parseInt(matchMin[1]);
    return { delayMinutos: delay, descricaoOriginal: `${delay} minutos`, jaPassou: false };
  }

  if (matchHoras) {
    const delay = parseInt(matchHoras[1]) * 60;
    return { delayMinutos: delay, descricaoOriginal: `${matchHoras[1]} hora(s)`, jaPassou: false };
  }

  if (matchHoraRelogio) {
    const hour = parseInt(matchHoraRelogio[1]);
    const minutes = parseInt(matchHoraRelogio[2] || '0');
    const target = new Date(now);
    target.setHours(hour, minutes, 0, 0);
    const jaPassou = target < now;
    return {
      delayMinutos: jaPassou ? null : Math.round(differenceInMinutes(target, now)),
      descricaoOriginal: `${String(hour).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`,
      jaPassou
    };
  }

  return { delayMinutos: null, descricaoOriginal: '', jaPassou: false };
}
