# Hyperframes Composition Brief: PiiI

## Objective
Create a short launch-style brag video for PiiI - a Chrome extension that masks personal data in your prompt before it reaches an AI chatbot.

## Output
- Composition directory: `brag-output/composition/`
- Rendered video: `brag-output/brag.mp4`
- Format: landscape - 1920x1080
- Duration: ~20.5 seconds

## Source Material
- Project root: `C:\Users\smith\Documents\1 Projects\PiiI`
- Primary files read: `README.md`, `website/index.html`, `src/brand.tsx`, `src/content/review/ReviewPanel.tsx`, `src/content/highlight/colors.ts`
- Product name: PiiI
- Tagline / strongest claim: "Mask your data before it reaches the AI." / "100% local - no server, no API, no telemetry."
- Key UI to recreate (faithfully): the in-product **ReviewPanel** redaction card from `src/content/review/ReviewPanel.tsx` - white card, 2px ink border, hard block shadow, paper2 header band with the 4-quadrant Bauhaus BrandMark + mono "PiiI · REVIEW BEFORE SEND" and a status dot (red while pending → green when redacted), detection rows of [alias input | detected text | category chip | confidence% | checkbox], footer "100% LOCAL" + Cancel / Send original / Redact & send (blue).
- Copy that must appear verbatim:
  - "About to hit send?"
  - "PiiI catches it first."
  - "Only the masked version leaves."
  - "100% LOCAL" · "NO TELEMETRY" · "MIT LICENSED"
  - "Mask your data before it reaches the AI."
  - aliases: `[NAME_1]` `[EMAIL_1]` `[PHONE_1]` `[SSN_1]`
  - category chips: NAME / EMAIL / PHONE / SSN
  - "github.com/JaySmith502/piii"

## Creative Direction
- Tone preset: app-store leaning polished
- Creative direction: the quiet local guard that catches your data at the send button - Bauhaus-precise, calm, sure of itself
- Interpretation: confidence through restraint and hard-edged Bauhaus motion; block-shadow slams and clean snaps, never frantic. The product does the talking.
- Angle: Everyone knows the half-second of dread after pasting a real email/SSN into ChatGPT. The video lives in that moment - one click from leaking it - then PiiI catches it, masks it, and only the safe version leaves. Specific to PiiI because every value, alias, and category chip on screen is exactly what the extension shows.
- Hook: A real PII-laden prompt types itself into an AI composer, the cursor heads for Send, and "About to hit send?" slams in.
- Outro / punchline: Three trust badges stamp in, then the BrandMark + PiiI wordmark with the tagline and GitHub line.
- Avoid: generic SaaS language; abstract filler visuals; the dark marketing-site palette (it is the old version - use the Bauhaus paper identity).

## Visual Identity
- Background: #FAF9F4 (paper); surfaces #FFFFFF, header bands #F2F1EA
- Text / borders: #141414 ink, muted #6E6E6E
- Accent: #1B81CE blue (primary / EMAIL), #ED3B2F red (NAME/SSN), #FFC400 yellow (PHONE), #1F9D55 green (success / "local")
- Signature treatment: 2px ink borders + hard offset block shadows (cards ~10px 10px 0 #141414, buttons collapse shadow on press), EASE `cubic-bezier(0.2,0.7,0.2,1)`
- Display font: Jost (800/900); Mono: JetBrains Mono (prompt, aliases, chips, labels); Body: Archivo (quiet sentences). Two voices: Jost = the human statement, JetBrains Mono = the machine/data being inspected.
- Visual references from the project: the ReviewPanel card, the 4-quadrant BrandMark (blue/red/yellow/ink blocks with circles), category color chips, the hard-block-shadow buttons.

## Storyboard
Use `brag-output/brag-plan.md` as the creative contract. Scene summary (final timing):
1. About to hit send - 0.0-3.3s - composer types a PII prompt, cursor → Send, "About to hit send?"
2. PiiI catches it - 3.3-5.5s - PII spans light up one by one in category colors; BrandMark stamps; "PiiI catches it first."
3. Review card (centerpiece) - 5.5-11.3s - ReviewPanel slams in; 4 detection rows snap in on the beat; cursor presses Redact & send; status dot red→green.
4. Only the masked version leaves - 11.3-14.3s - composer returns with alias chips in place of the PII; masked message whooshes out; caption.
5. Local by design - 14.3-17.0s - 100% LOCAL / NO TELEMETRY / MIT LICENSED badges stamp in.
6. Wordmark + CTA - 17.0-20.5s - platform chips flick; BrandMark + PiiI wordmark lands; tagline + GitHub.

## Audio
- Audio role: warm, clean, confident modern-tech bed; motion-matched SFX with restraint
- Audio arc: low bed under the typing → lifts as the card assembles → accent on the redact press → resolves warmly on the badges and wordmark
- Music: `assets/music/happy-beats-business-moves-vol-12-by-ende-dot-app.mp3` (vol-12, steady/clean, ~110 BPM) at volume 0.32, soft fade-out over the last ~1s
- Music cue guidance: bundled preset `assets/music/cues/happy-beats-business-moves-vol-12-by-ende-dot-app.music-cues.json`. Strong cues in window: 8.74, 10.93, 13.11, 17.47, 22.93. Beat grid ~0.54s. Lock the redact press to **10.93** and the wordmark land to **17.47** (2 strong-cue locks). Beat-grid the row reveals (6.00 / 6.56 / 7.09 / 7.64) but hold the full card afterward for reading. Span lights on 3.82 / 4.39 / 4.91 / 5.34. Badges on 14.73 / 15.29 / 15.84.
- Audio-reactive treatment: subtle. `audio-data.js` (window.AUDIO_DATA, 30fps, 630 frames, [bass, mid, overall]) drives a faint presence breath on the BrandMark and a soft glow on the review card / wordmark via RMS. No waveform/equalizer visuals.
- Audio-coupled moments:
  - Scene 1 typing - randomized keyboard keypress ticks
  - Scene 2 span lights - delicate glass pings per span
  - Scene 3 row reveals - one card-place per row; card slam = impactSoft_medium
  - Scene 3/4 redact press - mouseclick + impactBell success on the green flip
  - Scene 4 masked send - card-slide whoosh
  - Scene 5 badges - wood-light taps
  - Scene 6 wordmark - one impactBell_heavy_004 logo hit, then fade
- SFX selection guidance: motion-matched, restrained (app-store/polished). Volumes 0.5-0.75; softer for repeated ticks.
- Exact SFX choice: chosen and wired in the composition.
- Audio files: copied into `brag-output/composition/assets/` (music, cues, sfx).

## Hyperframes Instructions
- Single standalone `index.html`, root `data-composition-id="main"`, one registered timeline, 6 stacked `.scene` divs (scene1 visible, 2+ opacity 0), crossfade/clean transitions (app-store medium energy, ~0.4s).
- Show the real ReviewPanel UI faithfully; keep all text readable; total 15-25s.
- Beat-lock the 2 strong moments; beat-grid the sequential reveals but respect the reading floor.
- Subtle audio-reactivity on at least one element.
- Run lint + validate before render.
