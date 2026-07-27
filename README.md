# Dance Beat Trainer V5

Greenfield rewrite of the mobile-first dance learning app.

## Current deployed alpha

The site now implements a usable slice of the confirmed Grill Me conclusions:

- Strictly separate Practice and Review component trees
- One full-width teacher player in Practice
- Two players only in Review
- Local video import and local-first privacy
- Contain / cover / original-size display
- Mirror, rotation, pinch zoom, centroid pan, and single-finger adjustment
- Playback speed with original-pitch preference
- Manual BPM, Tap Tempo, half/double BPM, and current-count calibration
- Rolling 1–8 beat rail
- Smart loops for 1–4, 5–8, and 1–8 with optional connection beats
- Count-in
- Phrase-bound Motion, Knowledge, and Learning notes
- Continuous personal count-master recording alpha
- Teacher-master-clock review sync with ±15 second offset

The complete source of truth remains in `docs/`.

## Important status

This is an **alpha**, not the complete PRD implementation. Tempo Map editing, automatic beat analysis, count segmentation, punch-in, full Motion Timeline, knowledge reuse, delayed learning review, project library, and export remain staged work.

## Local verification

```bash
npm install
npm test
npm run build
```

## Deployment isolation

This repository is hard-locked to the Worker name:

```text
dance-beat-trainer-v5
```

The workflow rejects legacy deployment names including Looptube and `dance-beat-pro`.
