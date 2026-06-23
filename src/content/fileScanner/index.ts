import { createRoot } from 'react-dom/client'
import { createElement } from 'react'
import { extractText } from './extractors'
import { ScanWarningModal } from './ScanWarningModal'
import { runDetection, combineDetections } from '../detection'
import { sendToBackground } from '../utils'
import type { NerResponse } from '../../background/messages'
import type { Detection } from '../../types'

// ponytail: module-level flag - same pattern as skipNextSubmit in submit.ts
let releasing = false

let activeRoot: ReturnType<typeof createRoot> | null = null
let activeContainer: HTMLElement | null = null

function showModal(
  input: HTMLInputElement,
  originalFiles: FileList,
  classCounts: Record<string, number>,
  truncated: boolean,
  scanFailed = false,
): void {
  hideModal()

  const container = document.createElement('div')
  container.setAttribute('data-piiii-scan-warning', 'true')
  document.body.appendChild(container)
  activeContainer = container

  const root = createRoot(container)
  activeRoot = root

  root.render(
    createElement(ScanWarningModal, {
      fileName: originalFiles[0]?.name ?? 'unknown',
      classCounts,
      truncated,
      multiFile: originalFiles.length > 1,
      scanFailed,
      onProceed: () => {
        hideModal()
        releaseFile(input, originalFiles)
      },
      onCancel: () => {
        hideModal()
        input.value = ''
      },
    })
  )
}

function hideModal(): void {
  if (activeRoot) { activeRoot.unmount(); activeRoot = null }
  if (activeContainer) { activeContainer.remove(); activeContainer = null }
}

function releaseFile(input: HTMLInputElement, originalFiles: FileList): void {
  const dt = new DataTransfer()
  for (const file of Array.from(originalFiles)) dt.items.add(file)
  input.files = dt.files
  releasing = true
  input.dispatchEvent(new Event('change', { bubbles: true }))
  // releasing reset synchronously - dispatchEvent processes listeners in this call frame
  releasing = false
}

// state is per-scan; shared with cleanup closure so cleanup can abort an in-flight scan
async function scanAndDecide(
  input: HTMLInputElement,
  originalFiles: FileList,
  state: { aborted: boolean },
  getWhitelist: () => Set<string>,
): Promise<void> {
  let result: { text: string; truncated: boolean } | null
  try {
    result = await extractText(originalFiles[0])
  } catch (err) {
    if (state.aborted) return
    // Supported file we meant to scan but couldn't parse — warn instead of
    // releasing it unscanned (fail closed).
    console.warn('[PiiI] file extraction failed:', err)
    showModal(input, originalFiles, {}, false, true)
    return
  }
  if (state.aborted) return

  if (!result) {
    // Unsupported type — nothing to scan, release unblocked
    releaseFile(input, originalFiles)
    return
  }

  const { text, truncated } = result

  const regexDetections: Detection[] = runDetection(text, getWhitelist())

  // NER with 2s timeout (conversationId unused for file scans)
  const nerPromise = sendToBackground<NerResponse>({ type: 'RUN_NER', text, conversationId: '' })
  const timeoutPromise = new Promise<NerResponse>(
    resolve => setTimeout(() => resolve({ ok: false, error: 'timeout' }), 2000)
  )
  const nerResult = await Promise.race([nerPromise, timeoutPromise])
  if (state.aborted) return

  const nerDetections: Detection[] = nerResult.ok ? nerResult.detections : []
  const all = combineDetections(regexDetections, nerDetections, getWhitelist())

  const classCounts: Record<string, number> = {}
  for (const d of all) {
    classCounts[d.category] = (classCounts[d.category] ?? 0) + 1
  }

  if (Object.keys(classCounts).length === 0) {
    releaseFile(input, originalFiles)
    return
  }

  showModal(input, originalFiles, classCounts, truncated)
}

export function setupFileScanner(getWhitelist: () => Set<string>): () => void {
  let currentState: { aborted: boolean } | null = null

  const handler = async (e: Event) => {
    if (releasing) return  // our own re-dispatch - pass through

    const input = e.target as HTMLInputElement
    if (input.type !== 'file' || !input.files?.length) return

    // Capture files synchronously before any await
    const originalFiles = input.files

    e.stopImmediatePropagation()

    // Abort any in-flight scan before starting a new one
    if (currentState) currentState.aborted = true

    const state = { aborted: false }
    currentState = state
    await scanAndDecide(input, originalFiles, state, getWhitelist)
    currentState = null
  }

  document.addEventListener('change', handler, true)

  return () => {
    document.removeEventListener('change', handler, true)
    if (currentState) currentState.aborted = true
    hideModal()
  }
}
