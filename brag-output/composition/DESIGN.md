# DESIGN.md - PiiI brag video

## Style Prompt
Bauhaus-precise product film for a privacy tool. Warm paper canvas, hard ink borders, solid offset block shadows, primary blue/red/yellow used as categorical signal - not decoration. Calm and confident: things slam into place and hold, never flutter. Two typographic voices in conversation: Jost (the human statement) and JetBrains Mono (the machine data being inspected). Every surface looks like the extension's real UI, because it is.

## Colors
- `#FAF9F4` paper - canvas background (role: base)
- `#FFFFFF` white - cards / composer surfaces
- `#F2F1EA` paper2 - header bands, insets
- `#141414` ink - all borders, block shadows, primary text
- `#6E6E6E` ink500 - muted labels, secondary text
- `#1B81CE` blue - primary action / EMAIL category
- `#ED3B2F` red - NAME / SSN category, pending status
- `#FFC400` yellow - PHONE category (ink text on yellow)
- `#1F9D55` green - success / "local" / redacted status

## Typography
- Display: **Jost** (weights 800/900) - headlines, wordmark, the spoken lines
- Mono: **JetBrains Mono** (400/700) - prompt text, aliases, category chips, labels, data
- Body: **Archivo** (500/600) - quiet full sentences / taglines
- Tracking tight on display (-0.03em); mono labels use +0.10em uppercase.

## Motion
- Signature ease `cubic-bezier(0.2,0.7,0.2,1)` for slams; `power2/power3.out` for entrances; `back.out` only on the BrandMark stamp.
- Hard block-shadow slam: element scales 0.9→1 + shadow offset grows in ~0.35s.
- Buttons collapse their block shadow on press (translate to 0,0).
- Sequential reveals snap on the music's beat grid, then the full set holds for reading.
- Subtle audio-reactive: BrandMark presence + card/wordmark glow breathe with RMS (3-6% only).

## What NOT to Do
- No dark background / the old marketing-site palette (`#0b0f17`, neon green). Paper only.
- No soft drop-shadows or blur - shadows are hard, solid, offset.
- No waveform bars, equalizer, particles, or musical-note graphics.
- No third sans-serif; keep to Jost + JetBrains Mono + Archivo.
- No jump cuts - every scene transitions and every element animates in.
