import type { Detection, AliasMap, PlatformId } from '../../types'
import { sendToBackground } from '../utils'
import type { BackgroundResponse } from '../../background/messages'

const CATEGORY_PREFIX: Record<string, string> = {
  name:        'PERSON',
  address:     'ADDRESS',
  email:       'EMAIL',
  phone:       'PHONE',
  ssn:         'SSN',
  credit_card: 'CREDIT_CARD',
  api_key:     'API_KEY',
  account_id:  'ACCOUNT_ID',
  date:        'DATE',
  url:         'URL',
}

export async function assignAliases(
  detections: Detection[],
  conversationId: string,
  platform: PlatformId,
): Promise<Detection[]> {
  if (detections.length === 0) return []

  try {
    // 1. Fetch existing map
    const response = await sendToBackground<{ ok: boolean; data: AliasMap | null }>({
      type: 'GET_ALIAS_MAP',
      conversationId,
    })

    const aliases: Record<string, string> = response.ok && response.data
      ? { ...response.data.aliases }
      : {}

    let modified = false

    // 2. Assign aliases
    const result = detections.map(detection => {
      if (aliases[detection.text]) {
        return { ...detection, alias: aliases[detection.text] }
      }
      const prefix = CATEGORY_PREFIX[detection.category] ?? 'PII'
      const count = Object.values(aliases).filter(v => v.startsWith(`[${prefix}_`)).length
      const alias = `[${prefix}_${count + 1}]`
      aliases[detection.text] = alias
      modified = true
      return { ...detection, alias }
    })

    // 3. Persist if changed
    if (modified) {
      await sendToBackground<BackgroundResponse>({
        type: 'SET_ALIAS_MAP',
        conversationId,
        platform,
        aliases,
      }).catch((err: unknown) => {
        // ponytail: write failure — aliases work this session but won't persist; log and continue
        console.warn('[PiiI] alias map write failed:', err)
      })
    }

    return result
  } catch (err) {
    // GET_ALIAS_MAP failed — return detections without aliases so highlights still show
    console.warn('[PiiI] alias assignment failed, returning unaliased detections:', err)
    return detections
  }
}
