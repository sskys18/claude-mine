export interface Session {
  projectDir: string;
  projectName: string;
  sessionId: string;
  transcriptPath: string;
  hookEvent: string;
  lastActivity: Date;
  alarmMessageId: number;
  chatId: number;
}

const sessions = new Map<number, Session>();
// Maps any bot-sent message ID back to the alarm message ID that owns the session
const responseToAlarm = new Map<number, number>();
let activeAlarmId: number | null = null;

export function storeSession(alarmMessageId: number, session: Session): void {
  sessions.set(alarmMessageId, session);
}

export function getSession(alarmMessageId: number): Session | undefined {
  return sessions.get(alarmMessageId);
}

export function setActiveSession(alarmMessageId: number | null): void {
  activeAlarmId = alarmMessageId;
}

export function getActiveSession(): Session | undefined {
  if (activeAlarmId === null) return undefined;
  return sessions.get(activeAlarmId);
}

/** Track a bot response message so replies to it route to the same session */
export function mapResponseToAlarm(
  responseMessageId: number,
  alarmMessageId: number,
): void {
  responseToAlarm.set(responseMessageId, alarmMessageId);
}

/** Given any message ID (alarm or bot response), return the alarm ID that owns the session */
export function getAlarmIdForMessage(messageId: number): number | undefined {
  if (sessions.has(messageId)) return messageId;
  return responseToAlarm.get(messageId);
}

export function clearSession(alarmMessageId: number): void {
  if (activeAlarmId === alarmMessageId) activeAlarmId = null;
  sessions.delete(alarmMessageId);
}
