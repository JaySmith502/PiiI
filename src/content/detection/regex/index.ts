import type { Detection } from '../../../types'
import { detectEmail } from './email'
import { detectPhone } from './phone'
import { detectUrl } from './url'
import { detectSsn } from './ssn'
import { detectCreditCard } from './creditCard'
import { detectApiKey } from './apiKey'
import { detectAccountId } from './accountId'
import { detectDate } from './date'

export function runRegexDetectors(text: string): Detection[] {
  return [
    ...detectEmail(text),
    ...detectPhone(text),
    ...detectUrl(text),
    ...detectSsn(text),
    ...detectCreditCard(text),
    ...detectApiKey(text),
    ...detectAccountId(text),
    ...detectDate(text),
  ]
}
