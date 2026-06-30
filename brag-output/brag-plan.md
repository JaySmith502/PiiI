# Brag Plan: PiiI

## What is this app?
PiiI is an open-source Chrome extension that catches personal data (name, email, phone, SSN, credit card...) in your prompt and swaps each value for an alias *before* the message leaves your browser - 100% local, no server, no telemetry.

## The angle
Everyone has felt the half-second of dread after pasting a real email, SSN, or contract into ChatGPT. PiiI is the guard that stands at the send button. The video lives in that exact moment: you're one click from leaking it - then PiiI catches it, masks it, and only the safe version goes out. The hero is the product's real redaction card doing its job, rendered in PiiI's own Bauhaus paper identity (hard ink borders, block shadows, primary blue/red/yellow). Specific to PiiI because every value, alias, and category chip on screen is exactly what the extension shows.

## Hook (first 2-3 seconds)
A clean AI chat composer on cream paper. A real prompt types itself out in mono - "Hi, I'm John Smalley. Email john@acme.com, phone 555-123-4567, SSN 402-19-8475." - and the cursor slides onto a big Send arrow. Bold line slams: **"About to hit send?"** The dread is the hook.

## Key moments (the middle)
- The send freezes; the Bauhaus BrandMark stamps in; each PII span in the prompt lights up in its category color one by one (name red, email blue, phone yellow, SSN red).
- The real ReviewPanel card slams in and detection rows snap in one by one: `[NAME_1] John Smalley · NAME · 98%`, `[EMAIL_1] · EMAIL · 99%`, `[PHONE_1] · PHONE · 95%`, `[SSN_1] · SSN · 97%`.
- Cursor presses the blue **Redact & send** button (block shadow collapses on press), the status dot flips red→green, and the real values morph into aliases - the masked prompt is what flies out.

## Outro / punchline
Three hard-bordered badges stamp in - **100% LOCAL · NO TELEMETRY · MIT LICENSED** - then the BrandMark + wordmark with the tagline "Mask your data before it reaches the AI" and the GitHub line.

## User flow worth showing
Entry → key action → result, straight from the product:
1. Type a prompt with PII into an AI composer and go to send.
2. PiiI intercepts and shows the review card; rows of detected values with proposed aliases.
3. Click Redact & send - real values become aliases, only the masked text leaves. This redaction card IS the centerpiece, recreated faithfully from `src/content/review/ReviewPanel.tsx`.

## Tone
- Preset: app-store (clean, confident feature reveals) leaning polished
- Creative direction: the quiet local guard that catches your data at the send button - Bauhaus-precise, calm, sure of itself
- Interpretation: confidence through restraint and hard-edged Bauhaus motion; snappy block-shadow slams and clean snaps, never frantic. The product does the talking.

## Format: landscape - 1920x1080
## Duration: ~20 seconds

## Visual identity (from the project)
- Background: #FAF9F4 (paper); surfaces #FFFFFF, header bands #F2F1EA (paper2)
- Accent: #1B81CE blue (primary), #ED3B2F red, #FFC400 yellow, #1F9D55 green (success / "local")
- Text / borders: #141414 ink, muted #6E6E6E
- Signature treatment: 2px ink borders + hard offset block shadows (`7px 7px 0 #141414` on cards, `4px 4px 0` on buttons), EASE `cubic-bezier(0.2,0.7,0.2,1)`
- Display font: Jost (800/900); Body font: Archivo; Mono: JetBrains Mono (prompt text + alias chips + category labels)
- Strongest visual element: the real ReviewPanel redaction card and the 4-quadrant Bauhaus BrandMark (blue/red/yellow/ink blocks with circles)

## Share copy (draft)
Built PiiI: a Chrome extension that catches the name, email, phone, and SSN in your prompt and masks them *before* they hit ChatGPT. 100% local - nothing ever leaves your browser. Open source.

## Audio direction
- Role: warm, clean, confident modern-tech bed - polished, never busy
- Music: clean mid-tempo tech/minimal bed (Hyperframes picks the bundled track that best fits; mood = confident, modern, precise)
- Music treatment: in from frame 0 at a moderate bed level, light duck under the typing, gentle lift into the redact moment, soft fade on the outro
- Music cue guidance: target a strong cue for the ReviewPanel slam (~scene 3 start) and the Redact & send press (~scene 4); use the bundled track's preset if present, otherwise detect at composition time. Row reveals in scene 3 want a beat-grid window but held to the read floor (snap every other beat).
- Audio-reactive treatment: subtle - allow a faint presence lift on the card and BrandMark at the redact beat; no waveform bars.
- SFX posture: moderate, motion-matched, professional restraint
- Audio-coupled moments: key ticks while the prompt types; soft detect chime as each span lights; a clean snap per detection row; a tactile button press + send whoosh on Redact & send; light stamps on the badge reveal; one quiet logo hit on the wordmark
- Restraint rule: no comedic or chaotic SFX, no constant ticking, nothing that fights the music; sound supports the motion, it does not perform

## Storyboard

### Scene 1 - About to hit send - 3.2s
Cream paper. A minimal AI composer (white field, 2px ink border, block shadow) with a blinking caret. The prompt types itself out in JetBrains Mono: "Hi, I'm John Smalley. Email john@acme.com, phone 555-123-4567, SSN 402-19-8475." The cursor glides onto a bold Send arrow. Bauhaus line slams bottom-left: **"About to hit send?"** (hold ~1s).
Sequential/interaction: yes - the prompt types character by character; cursor moves to the Send button.
Audio intent: rising tension, the calm before a mistake.
Audio-coupled idea: subtle key ticks on the typing; a soft tick as the cursor lands on Send.
Music: low confident bed, slightly ducked.
Transition mood: hard → Scene 2

### Scene 2 - PiiI catches it - 2.3s
The frame freezes at the send. The Bauhaus BrandMark stamps in with a hard block-shadow. Each PII span inside the prompt lights up one by one in its category color: John Smalley (red), john@acme.com (blue), 555-123-4567 (yellow), 402-19-8475 (red). Line: **"PiiI catches it first."**
Sequential/interaction: yes - spans light up one at a time.
Audio intent: a clean "gotcha" - alert but reassuring.
Audio-coupled idea: a soft detect chime per span as it lights.
Music: bed lifts a touch.
Transition mood: clean wipe → Scene 3

### Scene 3 - The review card (centerpiece) - 5.0s
The real ReviewPanel slams in: white card, 2px ink border, 7px hard block shadow, paper2 header band with the BrandMark + mono "PiiI · REVIEW BEFORE SEND" and a red status dot. Under "// DETECTED · 4 ITEMS", four detection rows snap in one by one, each: alias input + detected text + category chip + confidence% + checked box - `[NAME_1] John Smalley · NAME · 98%`, `[EMAIL_1] john@acme.com · EMAIL · 99%`, `[PHONE_1] 555-123-4567 · PHONE · 95%`, `[SSN_1] 402-19-8475 · SSN · 97%`. Footer shows "100% LOCAL" and the buttons. Hold the full card.
Sequential/interaction: yes - 4 rows arrive one by one, each with a snap; hold the full set ~1.8s for reading.
Audio intent: precise, satisfying assembly - the product working.
Audio-coupled idea: a clean card snap per row reveal.
Music: steady confident bed on the beat grid.
Transition mood: clean → Scene 4

### Scene 4 - Redact & send - 3.5s
A cursor moves to the blue "Redact & send" button and presses it - the button's block shadow collapses on press (the real :active state). The header status dot flips red→green. In the composer behind/beside it, the real values morph into their aliases ([NAME_1], [EMAIL_1], [PHONE_1], [SSN_1]) and the masked prompt whooshes out. Line: **"Only the masked version leaves."**
Sequential/interaction: yes - simulate the button press; then the value→alias swap.
Audio intent: decisive, clean resolution - relief.
Audio-coupled idea: tactile button press click + a clean send whoosh on the swap.
Music: gentle lift / accent on the press.
Transition mood: soft → Scene 5

### Scene 5 - Local by design - 3.0s
On paper, three hard-bordered Bauhaus badges stamp in left to right: **100% LOCAL**, **NO TELEMETRY**, **MIT LICENSED** (green check accent). Sub line in mono: "Detection runs in your browser. Nothing is sent."
Sequential/interaction: yes - badges stamp in one by one.
Audio intent: grounded, trustworthy.
Audio-coupled idea: a light stamp per badge.
Music: bed holds, warm.
Transition mood: clean → Scene 6

### Scene 6 - Wordmark + CTA - 3.2s
Platform chips flick across (ChatGPT, Claude, Gemini, Copilot, Perplexity, DeepSeek), then settle into the BrandMark + big Jost wordmark **PiiI**, tagline "Mask your data before it reaches the AI.", and "github.com/JaySmith502/piii".
Sequential/interaction: yes - platform chips appear in quick succession, then resolve to the logo.
Audio intent: confident sign-off.
Audio-coupled idea: one quiet logo hit on the wordmark; soft fade after the CTA.
Music: resolve and fade.
Transition mood: end

**Music mood for this video:** clean, confident, modern minimal tech - mid-tempo, precise, not busy.
**Audio summary:** A calm confident bed rises through the typing, snaps tight as the review card assembles and the redact press lands, then resolves warmly on the local/trust badges and the wordmark - SFX are motion-matched and restrained throughout.
