# AGENTS.md

## Project

`bing-ui` is a Vue 3 component library focused on creative interaction, polished motion, and non-traditional UI aesthetics.

Use Chinese when communicating with the user unless they ask otherwise.

## Environment

- The user's machine is Windows.
- Run commands with PowerShell.
- Use `pnpm` for package management. Do not switch to npm or yarn unless explicitly requested.
- The project root is `C:/workspace/bing-ui`.
- For previews, prefer reusing the existing port. If the port is occupied and a new service is required, use a different port and do not close the user's current Storybook process.

## Stack

- Vue 3 + TypeScript + SFC
- Vite library mode
- GSAP for animation
- Vitest + Vue Test Utils for unit/component tests
- Vitest Browser Mode for browser-backed component tests
- Playwright for visual regression screenshots
- Storybook for component documentation and previews
- Changesets for package versioning

## Commands

Use these commands from the project root:

```powershell
pnpm dev
pnpm storybook
pnpm test:run
pnpm test:browser -- --run
pnpm test:visual
pnpm build
pnpm build-storybook
```

### Storybook port handling

The `pnpm storybook` and `npm run storybook` scripts prefer port 6006 and automatically fall back to the next available port without prompting. Do not append another port with `pnpm storybook -- -p <port>`.

For a temporary fixed alternate port, run:

```powershell
$env:STORYBOOK_PORT=<port>; pnpm storybook
```

## Code Organization

- Export public components and utilities from `src/index.ts`.
- Put each component in its own directory under `src/components/<ComponentName>`.
- Keep the component `.vue`, `.types.ts`, `.test.ts`, `.stories.ts`, and local `index.ts` in that component directory.
- Re-export components through `src/components/index.ts`, then through `src/index.ts`.
- Put design tokens and global theme CSS in `src/theme`.
- Put reusable GSAP helpers, motion tokens, and animation utilities in `src/motion`.
- Put solidified local SVG icons used by components in `src/icons/icons.ts`. Components must import icons from `src/icons`, not from third-party icon packages; `@lucide/vue` is a devDependency for stories and tests only.
- Keep component tests beside components as `*.test.ts`.
- Keep Storybook stories beside components as `*.stories.ts`.
- Keep Playwright visual tests in `tests/visual`.

## GSAP Rules

- Prefer transform and opacity animations over layout properties.
- Use timelines for multi-step animation instead of chained delays.
- Scope DOM animation to the component instance.
- Clean up tweens, timelines, ScrollTriggers, and plugin state on component unmount.
- Respect `prefers-reduced-motion`.
- Register GSAP plugins once at app or module boundary.
- Do not leave long-running animations active after a component is destroyed.
- When writing or reviewing GSAP code, use the installed GSAP skills, especially `gsap-core`, `gsap-timeline`, `gsap-frameworks`, and `gsap-performance`.

## Component Standards

- Components should support accessible focus states, disabled states, and keyboard interaction where relevant.
- Props, emits, slots, and exported types should be explicit.
- Styling should use local component CSS plus shared CSS variables from `src/theme/index.css`.
- Avoid building generic traditional component-library visuals unless the user asks for that direction.
- Motion should feel intentional, not decorative-only.
- `BingIcon` is an icon normalization layer only. It should standardize size, stroke, color tone, and accessibility while accepting concrete local or third-party Vue/SVG icon components.
- `BingButton` icon usage must stay slot-based through `prefix` and `suffix`; do not hard-bind `BingButton` to `BingIcon`.
- AI-generated icons may be used as design-stage material only. Final icons must be solidified into local SVG/Vue components before they become part of the library.

## Testing Expectations

- For logic changes, run `pnpm test:run`.
- For component library API/build changes, run `pnpm build`.
- For any change that may affect UI rendering, layout, styling, animation, interaction, Storybook stories, or visual behavior, use Playwright to open the affected Storybook story/page and verify the rendered result before final response. Report the page/story checked and what was verified.
- Visual regression is paused during early component iteration.
- Do not run `pnpm test:visual` unless the user explicitly asks for visual regression.
- Do not update Playwright visual snapshots unless the user explicitly asks.
- Storybook build warnings about Storybook bundle chunk size are acceptable unless they affect runtime behavior.

## Generated Files

Do not commit generated output directories:

- `dist`
- `storybook-static`
- `test-results`
- `playwright-report`
- `coverage`

Before handing work back, clean up temporary local files created by Codex, Storybook, dev servers, or verification runs. This includes root-level `.log` files such as `storybook-*.codex.*.log`, even when they are already ignored by git.

Do not edit `pnpm-lock.yaml` manually.
