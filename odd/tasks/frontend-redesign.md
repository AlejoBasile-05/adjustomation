# PackImg — Frontend redesign ("Blueprint Instrument")

Objective: make the PackImg UI aesthetic, modern, intuitive and professional, and repair the
broken Tailwind pipeline that made every `className` inert.
Branch: `feat/ui-redesign` (packimg repo). Delivery: work-unit commits on the feature branch; no push/PR.
Test runner: `npm run build` (tsc + vite), `npx tsc --noEmit`. No test framework exists in this repo.

## Specs

S1. Tailwind CSS v4 must actually generate utilities. `vite.config.ts` registers `@tailwindcss/vite`;
`src/index.css` uses `@import "tailwindcss"`; the dead v3 artifacts (`tailwind.config.js`, `src/App.css`)
are removed. Acceptance: `npm run build` exits 0 and the emitted CSS is > 15 kB and contains no literal
`@tailwind` at-rule.

S2. One semantic design-token layer drives every surface: `bg`, `surface`, `surface-2`, `surface-3`,
`fg`, `fg-soft`, `muted`, `line`, `line-strong`, `accent`, `accent-soft`, `accent-fg`, `danger`, `warn`,
`ok`. Tokens are exposed as Tailwind utilities (`bg-surface`, `text-muted`, `border-line`, ...) via
`@theme inline`, and every component uses them instead of raw `slate-*` / `white` / `bg-slate-800` pairs.

S3. Dark and light themes are both first-class, toggled from the header, persisted in
`localStorage["packimg-theme"]`, applied without a flash of the wrong theme, and defaulting to the OS
`prefers-color-scheme`. No component may hard-code a single-theme color.

S4. Aesthetic direction "Blueprint Instrument": dark-first technical instrument. Bricolage Grotesque
display, Instrument Sans body, JetBrains Mono for every numeric/dimension value. Signal-lime accent,
graph-paper atmosphere, hairline borders, restrained depth. Local bundled fonts (no CDN).

S5. Professional shell: sticky top bar with brand + theme toggle, a "Ingesta" rail (dropzone, thumbnails,
primary CTA), a workspace with the canvas preview, a configuration + results strip, and an instrument
status bar. Responsive down to 360 px wide; no horizontal scroll at 1440x900.

S6. Intuitive interactions: whole-window drag & drop, `Ctrl/Cmd+Enter` to pack, dismissible error toast,
canvas zoom (`Ajustar` / `100%`), visible empty states that explain the next action, honest disabled
states, and focus-visible rings on the accent color.

S7. Fix the surfaced UX defects: the error-toast close button must actually dismiss (`dismissError`);
components must not re-add panel chrome inside a panel (no double borders); the auto canvas-size effect
must not overwrite a manual size after a pack; `maxFiles = 50` must be enforced by `addImages`.

S8. Every user-facing string stays in Spanish, and every control keeps its accessible name
(`aria-label`, `role`, `<label>`) from the current implementation.

## Tasks

| ID | Covers | Route | Status | Commit |
| -- | ------ | ----- | ------ | ------ |
| T1 | S1, S2, S3, S4 | inline (parent) | done | `feat(ui): repair tailwind v4 pipeline and add design tokens` |
| T2 | S5, S6, S7 | inline (parent, after writer no-op) | done | `feat(ui): rebuild the workspace shell and component surfaces` |
| T3 | S6, S8 | inline (parent, after writer no-op) | done | same |
| T4 | S2, S6, S8 | delegated (writer) + parent repair | done | same |
| T5 | S2, S6, S7 | delegated (writer) + parent repair | done | same |
| T6 | S7 | inline (parent) | done | same |
| T7 | S1, S5-S8 | delegated (verifier) | pending | — |

## Log

L1 (user, verbatim): "Actua como Desarrollador FullStack Senior experto en Automatizaciones. El frontend es
demasiado basico, hazlo mas estetico, moderno, intuitivo y profesional. Utiliza subagentes con las skills
que sean utiles para sus tareas."

L2 (evidence): `dist/assets/index-BOZd3U1h.css` is 977 bytes and still contains the literal
`@tailwind base;@tailwind components;@tailwind utilities;` at-rules, so Tailwind never ran. Root cause:
`tailwindcss@4.3.3` installed but configured as v3 (`@tailwind` directives + `tailwind.config.js`) with no
`@tailwindcss/vite` plugin. Every `className` in the app is inert; that is why the UI looks basic.

L3 (scope): the app is `packimg/` (Tauri 2 + React 19 + Vite 8). `frontend/` and `custom/` at the repo root
are empty root-owned directories and are not part of this work.

L4 (delegation outcome): four writers were launched in parallel with disjoint edit surfaces.
`SettingsPanel` and `ResultsPanel` were written but shipped a dead import, a leftover raw-palette
`StatCard`, an unassociated `<label>`, a `totalImages && ...` that renders a stray `0`, and a broken
`style={` in `CanvasPreview` (TS1005). `PackingApp`, `DropZone` and `ImageList` reported "done" in their
return envelope while their files were byte-identical to the baseline. The parent re-wrote those three,
repaired `SettingsPanel` and `CanvasPreview`, and completed `ResultsPanel`. Lesson for this repo: a
worker's report is a claim, not evidence — always diff the tree before trusting it.

L5 (verification, objective): `npx tsc --noEmit` exit 0; `npm run build` exit 0; emitted CSS 45.1 kB with
zero literal `@tailwind` at-rules; all semantic utilities (`.bg-canvas`, `.text-muted`, `.panel`,
`.btn-primary`, `.field`, `.chip`, `.stat-tile`, `.eyebrow`, `.blueprint`) present in the bundle. Headless
Firefox renders were analysed by pixel histogram (the parent cannot view images): light theme shows
`#e9ece6` canvas at 19.8%; the populated dark render shows `#06090a` at 72%, layered surfaces, the lime
accent at 0.66% (deliberately sparing), all five synthetic artwork colours present on the canvas plate,
and 8276 unique colours across 1700 px of composed layout.

L6 (hygiene): removed the unused Tailwind v3 tooling (`@tailwindcss/forms`, `@tailwindcss/typography`,
`autoprefixer`, `postcss`) so nobody re-wires the broken v3 path. `tailwindcss@4` + `@tailwindcss/vite`
are the only styling toolchain left.
