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

export function clearSession(alarmMessageId: number): void {
  if (activeAlarmId === alarmMessageId) activeAlarmId = null;
  sessions.delete(alarmMessageId);
}
