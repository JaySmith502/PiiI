import { C, FONT, BrandMark, BrandStyle } from '../brand'
import { PUBLIC_PRIVACY_URL, PUBLIC_SUPPORT_URL } from '../config/links'

// First-run onboarding. Opens once, in its own tab, right after install.
//
// Why it exists: the extension's whole value is a popup that appears at the
// moment you press send. A new user who installs it and sees nothing has no way
// to know whether it works, what it can detect, or what it does with their data.
// This page answers those three questions before the first prompt.

const SUPPORTED = [
  { label: 'ChatGPT', url: 'https://chatgpt.com/' },
  { label: 'Claude', url: 'https://claude.ai/' },
  { label: 'Gemini', url: 'https://gemini.google.com/' },
  { label: 'Copilot', url: 'https://copilot.microsoft.com/' },
  { label: 'Perplexity', url: 'https://www.perplexity.ai/' },
  { label: 'DeepSeek', url: 'https://chat.deepseek.com/' },
]

const DETECTS = [
  'Names', 'Addresses', 'Email addresses', 'Phone numbers', 'Social security numbers',
  'Credit card numbers', 'API keys', 'Account / ID numbers', 'Dates', 'URLs',
]

const STEPS = [
  {
    n: '01',
    title: 'You write your prompt as usual',
    body: 'PiiI watches the message box only on the chat sites listed below. It does not read other tabs, and it never reads your other browsing.',
  },
  {
    n: '02',
    title: 'Before anything is sent, it shows you what it found',
    body: 'Detected values are outlined in the message box. Press send and a review panel lists each one with a suggested alias like [EMAIL_1].',
  },
  {
    n: '03',
    title: 'You choose: redact, send as-is, or cancel',
    body: 'Accepted values are swapped for aliases before the message leaves your browser. The reply is translated back for you, so it still reads normally.',
  },
]

const PERMISSIONS = [
  ['storage', 'Keeps the alias map, audit log and whitelist on this device.'],
  ['offscreen', 'Runs the detection model in a hidden page — service workers cannot load ONNX.'],
  ['contextMenus', 'Adds “Always allow this term” to the right-click menu.'],
  ['alarms', 'Keeps the detection service awake while a chat page is open.'],
  ['activeTab', 'Lets the toolbar popup read the current conversation’s alias map.'],
]

function open(url: string): void {
  chrome.tabs.create({ url })
}

const h2: React.CSSProperties = {
  fontFamily: FONT.display, fontWeight: 900, fontSize: '26px', letterSpacing: '-0.02em',
  margin: '0 0 18px', color: C.ink,
}

const card: React.CSSProperties = {
  background: C.white, border: `2px solid ${C.ink}`, borderRadius: '10px',
  boxShadow: `5px 5px 0 ${C.ink}`, padding: '20px 22px',
}

export function Welcome() {
  const version = chrome.runtime.getManifest().version

  return (
    <div style={{
      minHeight: '100vh', background: C.paper, color: C.ink700,
      fontFamily: FONT.body, WebkitFontSmoothing: 'antialiased',
    }}>
      <BrandStyle />
      <div style={{ maxWidth: '820px', margin: '0 auto', padding: '52px 28px 72px' }}>

        {/* Hero */}
        <header style={{ marginBottom: '44px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '18px' }}>
            <BrandMark size={46} radius={9} />
            <span style={{ fontFamily: FONT.display, fontWeight: 900, fontSize: '38px', letterSpacing: '-0.04em', color: C.ink }}>
              PiiI
            </span>
            <span style={{
              fontFamily: FONT.mono, fontWeight: 700, fontSize: '10px', letterSpacing: '0.12em',
              textTransform: 'uppercase', color: C.ink500, border: `1.5px solid ${C.ink}`, borderRadius: '3px',
              padding: '3px 7px', alignSelf: 'center',
            }}>
              installed
            </span>
          </div>
          <h1 style={{
            fontFamily: FONT.display, fontWeight: 900, fontSize: '46px', lineHeight: '1.05',
            letterSpacing: '-0.03em', margin: '0 0 16px', color: C.ink, maxWidth: '620px',
          }}>
            Your prompts stay yours.
          </h1>
          <p style={{ fontSize: '17px', lineHeight: '26px', margin: 0, maxWidth: '620px', color: C.ink600 }}>
            PiiI reads the message box on your AI chat sites and offers to mask personal data
            <em> before</em> the message is sent. Everything runs on this device: there is no
            account, no server, and no telemetry.
          </p>
        </header>

        {/* How it works */}
        <h2 style={h2}>How it works</h2>
        <div style={{ display: 'grid', gap: '16px', marginBottom: '44px' }}>
          {STEPS.map(step => (
            <div key={step.n} style={{ ...card, display: 'flex', gap: '18px', alignItems: 'flex-start' }}>
              <span style={{
                fontFamily: FONT.mono, fontWeight: 700, fontSize: '13px', color: C.white,
                background: C.blue, borderRadius: '4px', padding: '5px 8px', flex: 'none',
              }}>
                {step.n}
              </span>
              <div>
                <div style={{ fontFamily: FONT.display, fontWeight: 800, fontSize: '17px', color: C.ink, marginBottom: '5px' }}>
                  {step.title}
                </div>
                <div style={{ fontSize: '14px', lineHeight: '21px', color: C.ink600 }}>{step.body}</div>
              </div>
            </div>
          ))}
        </div>

        {/* What it detects */}
        <h2 style={h2}>What it detects</h2>
        <div style={{ ...card, marginBottom: '44px' }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '14px' }}>
            {DETECTS.map(d => (
              <span key={d} style={{
                fontFamily: FONT.mono, fontWeight: 700, fontSize: '11px', color: C.ink,
                background: C.yellow100, border: `1.5px solid ${C.ink}`, borderRadius: '3px', padding: '4px 8px',
              }}>
                {d}
              </span>
            ))}
          </div>
          <p style={{ margin: 0, fontSize: '13px', lineHeight: '20px', color: C.ink600 }}>
            Pattern rules (email, phone, card, SSN, keys, IDs, dates, URLs) run instantly. Names and
            addresses come from a small language model that runs in your browser. Attachments are
            scanned too — <code style={{ fontFamily: FONT.mono, fontSize: '12px' }}>.txt</code>,{' '}
            <code style={{ fontFamily: FONT.mono, fontSize: '12px' }}>.csv</code>,{' '}
            <code style={{ fontFamily: FONT.mono, fontSize: '12px' }}>.md</code>,{' '}
            <code style={{ fontFamily: FONT.mono, fontSize: '12px' }}>.log</code>,{' '}
            <code style={{ fontFamily: FONT.mono, fontSize: '12px' }}>.json</code>,{' '}
            <code style={{ fontFamily: FONT.mono, fontSize: '12px' }}>.docx</code> and{' '}
            <code style={{ fontFamily: FONT.mono, fontSize: '12px' }}>.pdf</code>.
          </p>
        </div>

        {/* Privacy */}
        <h2 style={h2}>Where your data goes</h2>
        <div style={{ ...card, marginBottom: '44px' }}>
          <p style={{ margin: '0 0 16px', fontSize: '15px', lineHeight: '23px', color: C.ink }}>
            <strong>Nowhere.</strong> Prompt text, detected values and file contents never leave your
            browser. There is no backend to send them to. The only network request PiiI ever makes is
            the one-time download of the detection model on first use — after that it works offline.
          </p>
          <div style={{ borderTop: `1.5px solid ${C.ink150}`, paddingTop: '16px' }}>
            <div style={{ fontFamily: FONT.mono, fontWeight: 700, fontSize: '10px', letterSpacing: '0.14em', textTransform: 'uppercase', color: C.ink500, marginBottom: '10px' }}>
              Why it asks for these permissions
            </div>
            <dl style={{ margin: 0, display: 'grid', gap: '9px' }}>
              {PERMISSIONS.map(([perm, why]) => (
                <div key={perm} style={{ display: 'flex', gap: '12px', alignItems: 'baseline' }}>
                  <dt style={{ fontFamily: FONT.mono, fontWeight: 700, fontSize: '12px', color: C.blue, flex: 'none', width: '104px' }}>
                    {perm}
                  </dt>
                  <dd style={{ margin: 0, fontSize: '13px', lineHeight: '19px', color: C.ink600 }}>{why}</dd>
                </div>
              ))}
            </dl>
          </div>
        </div>

        {/* Try it */}
        <h2 style={h2}>Try it now</h2>
        <div style={{ ...card, marginBottom: '34px' }}>
          <p style={{ margin: '0 0 14px', fontSize: '14px', lineHeight: '21px', color: C.ink600 }}>
            Open a supported site, type a prompt containing something personal — an email address is
            enough — and press send. The review panel appears before the message goes out.
          </p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '9px' }}>
            {SUPPORTED.map(site => (
              <button key={site.label} className="piiii-btn" onClick={() => open(site.url)}>
                {site.label}
              </button>
            ))}
          </div>
          <p style={{ margin: '16px 0 0', fontSize: '12px', lineHeight: '18px', color: C.ink500 }}>
            Grok is not supported yet: its message box cannot be reached safely from an extension.
          </p>
        </div>

        {/* Footer */}
        <footer style={{
          display: 'flex', flexWrap: 'wrap', gap: '14px', alignItems: 'center',
          borderTop: `2px solid ${C.ink}`, paddingTop: '18px',
          fontFamily: FONT.mono, fontSize: '11px', color: C.ink500,
        }}>
          <span>PiiI v{version}</span>
          <span aria-hidden>·</span>
          <span>MIT licensed</span>
          <span aria-hidden>·</span>
          <a href={PUBLIC_SUPPORT_URL} target="_blank" rel="noreferrer" style={{ color: C.blue }}>
            Support
          </a>
          <span aria-hidden>·</span>
          <a href={PUBLIC_PRIVACY_URL} target="_blank" rel="noreferrer" style={{ color: C.blue }}>
            Privacy policy
          </a>
          <button
            onClick={() => open('chrome://extensions/shortcuts')}
            style={{
              marginLeft: 'auto', background: 'transparent', border: 'none', padding: 0,
              fontFamily: FONT.mono, fontSize: '11px', color: C.blue, cursor: 'pointer',
            }}
          >
            Keyboard shortcut settings
          </button>
        </footer>
      </div>
    </div>
  )
}
