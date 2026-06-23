const TEXT_EXTENSIONS = new Set(['.txt', '.csv', '.md', '.log', '.json'])
const MAX_CHARS = 50_000

function ext(file: File): string {
  const i = file.name.lastIndexOf('.')
  return i === -1 ? '' : file.name.slice(i).toLowerCase()
}

function readAsText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = () => reject(reader.error)
    reader.readAsText(file)
  })
}

async function extractDocx(file: File): Promise<string> {
  const mammoth = await import('mammoth')
  const arrayBuffer = await file.arrayBuffer()
  const result = await mammoth.extractRawText({ arrayBuffer })
  return result.value
}

async function extractPdf(file: File): Promise<string> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  // @ts-ignore — pdfjs-dist/build/pdf has no bundled .d.ts for this subpath
  const pdfjs = await import('pdfjs-dist/build/pdf') as any
  // Set worker src once (idempotent — safe to call on each PDF extraction)
  if (!pdfjs.GlobalWorkerOptions.workerSrc) {
    pdfjs.GlobalWorkerOptions.workerSrc = chrome.runtime.getURL('pdf.worker.min.mjs')
  }
  const arrayBuffer = await file.arrayBuffer()
  const doc = await pdfjs.getDocument({ data: arrayBuffer }).promise
  const pages: string[] = []
  for (let i = 1; i <= doc.numPages; i++) {
    const page = await doc.getPage(i)
    const content = await page.getTextContent()
    pages.push(content.items.map((item: { str: string }) => item.str).join(' '))
  }
  return pages.join('\n')
}

/**
 * Extract text from a file.
 * - Returns null for unsupported types (caller releases the file).
 * - THROWS if a supported type fails to parse, so the caller can warn rather
 *   than silently releasing a file we meant to scan (fail closed).
 */
export async function extractText(file: File): Promise<{ text: string; truncated: boolean } | null> {
  const e = ext(file)
  let read: (f: File) => Promise<string>
  if (TEXT_EXTENSIONS.has(e)) read = readAsText
  else if (e === '.docx') read = extractDocx
  else if (e === '.pdf') read = extractPdf
  else return null  // unsupported — caller releases immediately

  const raw = await read(file)
  const truncated = raw.length > MAX_CHARS
  return { text: raw.slice(0, MAX_CHARS), truncated }
}
