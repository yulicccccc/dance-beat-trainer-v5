# Dance Beat Trainer V5

Greenfield rewrite of the mobile-first dance practice app.

## Current scope

Phase 0 only:

- Strictly separate Practice and Review component trees
- One full-width teacher player in Practice
- Two players only in Review
- Local video import
- Contain / cover / original-size display
- Mirror and rotation
- Pinch zoom with two-finger centroid pan
- Single-finger pan in adjustment mode
- Cloudflare Worker static-assets deployment

The complete product source of truth remains the Master PRD v5 package.

## Local development

```bash
npm install
npm run dev
```

## Verification

```bash
npm test
npm run build
```

## Deployment target

This repository is hard-locked to the new Worker:

```text
dance-beat-trainer-v5
```

It contains no Looptube target, no legacy Pages project, no custom route, and no custom domain.

GitHub Actions requires repository secrets:

- `CLOUDFLARE_API_TOKEN`
- `CLOUDFLARE_ACCOUNT_ID`
