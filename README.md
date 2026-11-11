# Weeva website

German marketing page for the free Weeva calendar app. Static HTML, CSS and JavaScript; no account, analytics, remote fonts or backend required.

## Preview and build

- `npm run dev` serves the website at http://127.0.0.1:4173.
- `npm run check` checks the JavaScript syntax.
- `npm run build` creates the deployable static website in `dist/`.

## Design and motion

Adapted to Weeva from the user-licensed React Bits Pro AI SaaS reference at https://rbp-ai-saas-template.vercel.app. A crisp screenshot import story shows the path from a timetable image to a planned calendar week. Motion includes the fluid background, directional navbar with blur, hero parallax and compression, character-by-character scroll reveal, staggered entrances, draggable gallery with momentum and a subtle image lift, animated example calendars, a highlighted and animated “Smart” headline, orbiting pricing glows, animated FAQ disclosure, floating theme switch, and the original static footer composition with oversized wordmark and masked blue gradient.

The page uses actual Weeva app screenshots and its blue app icon. The preview plans are explicitly illustrative; actual screenshot import and AI planning happen in the iPhone app. Header examples update a compact week calendar and an expanded dialog. The everyday section shows an animated day agenda for each audience. Both previews offer replay, cancel previous runs when switching examples, and honor reduced motion. The App Store links point to the verified Weeva listing (id6793289050).

## Content pages

All pages are static HTML and work at their existing `.html` URLs, including under a GitHub Pages project path. The start page retains its section navigation; footer and detail links open the full pages:

- `funktionen.html`: calendar, AI, focus, goals and widgets, with actual app screenshots.
- `so-funktionierts.html`: getting started and step-by-step timetable import.
- `kostenlos.html`: free features and cloud AI usage limits.
- `faq.html`: grouped, linkable native FAQ disclosures.
- `support.html`: contact, troubleshooting, backups and feedback.
- `privacy.html`: privacy notice for both website and app, updated against app behavior.
- `impressum.html`: existing operator details and current dispute resolution notice.

Content pages reuse `landing.css` tokens and add `subpages.css` for readable document layouts, a table of contents, responsive product imagery, print styles and accessible mobile navigation. `subpages.js` handles menus, persisted light/dark mode, current table-of-contents links and opening directly linked FAQ answers. No landing-page animation dependencies are loaded on content pages. Content, native disclosures, links and mobile navigation remain available without JavaScript.

The privacy notice covers the browser theme preference, the two configured website delivery paths (GitHub Pages and OpenAI Sites), app update checks, pseudonymous quota checks, actual AI payloads, on-device fallback, calendar permissions, exports and local dictation. It distinguishes the daily seven-day usage-record cleanup from provider logs and the iOS install identifier retained in Keychain. Operator identity and address come from the pre-existing legal pages. Live provider settings, actual hosting log retention, processing agreements and transfer safeguards cannot be verified from source code and should be maintained alongside the published service configuration.

Animations honor reduced motion. WebGL falls back to static graphics. All fonts, icons, scripts and images are self-hosted. Third-party license notices are included in `assets/`.

## GitHub Pages

Public website repository: https://github.com/PascalGri/weeva-website

Live website: https://pascalgri.github.io/weeva-website/

The workflow in `.github/workflows/pages.yml` checks the JavaScript, builds `dist/` and deploys it to GitHub Pages after each push to `main`. It can also be started manually from the Actions tab. The repository's Pages publishing source must be set to **GitHub Actions** (`build_type: workflow`). Generated `dist/` files are not committed.

To update the live website, edit this repository, run `npm run check` and `npm run build`, review the changes, commit them and push `main`. Keep all paths relative so pages and assets work below `/weeva-website/`.

This repository contains only the public website. App source, credentials and private Sites configuration are excluded.
