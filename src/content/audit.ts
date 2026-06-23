import type { PlatformId, AuditEntry } from '../types'
import { sendToBackground } from './utils'

export async function logAuditEntry(
  platform: PlatformId,
  classesDetected: string[],
  action: 'accepted' | 'edited' | 'sent_original',
  aliasCount: number,
): Promise<void> {
  const entry: AuditEntry = {
    timestamp: new Date().toISOString(),
    platform,
    classesDetected,
    action,
    aliasCount,
  }
  await sendToBackground({ type: 'LOG_AUDIT', entry })
    .catch((err: unknown) => console.warn('[PiiI] audit log failed:', err))
}
