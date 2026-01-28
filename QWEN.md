# AGENTS.md

This repository is a **multi-vendor food delivery system** with a React + TypeScript frontend and a Node/Express backend.

This file is a **dedicated guide for AI coding agents**. Follow it to make consistent, safe, and high-quality contributions.

## Project Overview

- **Frontend**: Vite + React (functional components) + TypeScript (strict) + React Router.
- **UI**: Tailwind CSS + shadcn/ui (Radix primitives) + `class-variance-authority`.
- **Forms/Validation**: React Hook Form + Zod.
- **API**: Axios, with a shared Axios client (`frontend/src/lib/httpClient.ts`) and service modules (`frontend/src/services/*`).
- **Backend**: Express + MongoDB (Mongoose) + JWT/cookies.

## Repository Layout

- `frontend/`
  - `src/pages/` route-level screens
  - `src/components/` reusable UI/sections
  - `src/components/ui/` **shadcn/ui components**
  - `src/services/` API wrappers (Axios)
  - `src/lib/` shared libs (e.g., `httpClient.ts`, `validation.ts`)
  - `src/utils/` utilities (e.g., `cn.ts`)
- `backend/`
  - Node/Express app (see `backend/package.json`)

## Technology Stack (Authoritative)

### Frontend

- **Build tool**: Vite (`frontend/vite.config.js`)
- **TypeScript**: strict mode enabled (`frontend/tsconfig.json`)
- **Routing**: `react-router-dom` (`frontend/src/App.tsx`)
- **Styling**: Tailwind CSS (`frontend/tailwind.config.js`)
- **shadcn/ui**: configured via `frontend/components.json`
  - UI components live in `frontend/src/components/ui/`
  - Aliases:
    - `@/` -> `frontend/src/` (TS paths + Vite alias)
    - shadcn aliases: `components` -> `@/components`, `utils` -> `@/utils`

### Backend

- **Runtime**: Node.js
- **Framework**: Express
- **DB**: Mongoose
- **Auth**: JWT, cookies (`cookie-parser`, `cors`)

## Non-Negotiable Agent Rules

- **Do not change unrelated code.** Keep diffs minimal and scoped to the request.
- **No `any` unless truly unavoidable.** If you must use `any`, justify it in the PR description and isolate it.
- **Handle errors gracefully**:
  - User-facing: toast / inline error states with clear guidance
  - Developer-facing: log meaningful context (avoid leaking secrets)
- **Keep code simple and readable**:
  - Remove redundancy
  - Prefer clear naming and strong typing
  - Avoid clever abstractions unless they reduce complexity

## Coding Standards (React + TypeScript)

- **Use functional components** and hooks.
- **Type everything**:
  - Prefer `type`/`interface` for API payloads and component props.
  - Avoid implicit `any`.
- **Performance**:
  - Use `React.memo`, `useMemo`, `useCallback` when re-renders are measurable/likely.
  - Prefer derived state over duplicated state.
- **Routing**:
  - Route pages live in `frontend/src/pages/`.
  - `frontend/src/App.tsx` defines top-level routes.

## UI Components & Styling

### Use shadcn/ui first

- **Always prefer shadcn/ui components** for common UI:
  - Buttons, inputs, dialogs, dropdowns, forms, toasts, etc.
- Add new components via:

```bash
# run inside ./frontend
npx shadcn-ui@latest add <component>
```

- Existing components are in `frontend/src/components/ui/`.
- Use the shared class helper:
  - `cn` is in `frontend/src/utils/cn.ts`

### Tailwind-first styling (avoid custom CSS)

- **Try not to use custom CSS**. Prefer Tailwind utilities.
- If you must add custom CSS, keep it minimal and local, and ensure it cannot be done reasonably with Tailwind.
- Tailwind content paths are defined in `frontend/tailwind.config.js`.

### Variants with `cva`

- Use `class-variance-authority` for variant-driven components.
- Follow the existing pattern in `frontend/src/components/ui/button.tsx`.

### UI/Design balance (required)

- Build **clean, modern UIs**:
  - Subtle shadows/gradients are fine
  - Avoid overly “Bootstrap-like” layouts
  - Sparsely and subtly use experimental shapes/layouts when appropriate
- **Responsiveness** is mandatory:
  - Mobile-first
  - Use Tailwind responsive prefixes (`sm:`, `md:`, `lg:`)
  - Manually test on small and large viewports

## UX / Accessibility

- Ensure keyboard navigation works for interactive components.
- Use accessible primitives from shadcn/Radix (they handle many ARIA details).
- Keep contrast readable and text sizes appropriate.
- Prefer consistent feedback:
  - Loading states (disable buttons, show spinners)
  - Error states (inline + toast)

## Forms & Validation (required)

- Use **React Hook Form** + **Zod** (already in use).
- Put schemas in `frontend/src/lib/validation.ts` (or nearby domain schema modules if it grows).
- Provide real-time helpful error messages and prevent invalid submissions.

Example pattern:

```tsx
const form = useForm<MyFormData>({
  resolver: zodResolver(mySchema),
  defaultValues: {
    /* ... */
  },
});
```

## API & Data Handling

- Prefer `frontend/src/lib/httpClient.ts` (Axios instance) and keep API calls inside `frontend/src/services/*`.
- **Always type API responses**.
- Handle UI states:
  - **Loading**: disable inputs/buttons, show spinner/skeleton
  - **Error**: show a toast + recoverable UI

Toast usage (already wired via `Toaster` in `frontend/src/main.tsx`):

```tsx
const { toast } = useToast();

toast({
  title: 'Error',
  description: 'Something went wrong. Please try again.',
  variant: 'destructive',
});
```

### Environment configuration

- The shared Axios base URL uses `import.meta.env.VITE_API_BASE_URL` (fallback `http://localhost:2002`).
- **Do not hardcode secrets**. Use `.env` / runtime config.

### Security rules

- Sanitize/validate inputs.
- Avoid exposing tokens in logs.
- Prefer secure auth patterns:
  - HttpOnly cookies when feasible
  - Avoid storing long-lived secrets in `localStorage` unless explicitly required

## Animations (required)

- Prefer **Framer Motion** for animations.
- Keep animations subtle (fades/slides), performant, and consistent.

If the feature needs motion and Framer Motion is not installed, add it intentionally:

- Add dependency: `npm i framer-motion` (inside `frontend/`)
- Keep changes minimal and include it in the commit message.

Example:

```tsx
import { motion } from 'framer-motion';

<motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}>
  {/* content */}
</motion.div>;
```

## Verification Procedures (mandatory)

After **every** change (even small ones), run the following from `frontend/`:

- **Lint**:

```bash
npm run lint
```

- **Typecheck** (this project has `noEmit: true` in `tsconfig.json`):

```bash
npx tsc --noEmit
```

- **Build**:

```bash
npm run build
```

- **Run dev server** and check the changed flows in the browser:

```bash
npm run dev
```

Manual verification checklist:

- Login/Register/Forgot Password flows (if touched)
- Navigation and routes (React Router)
- Responsive layout on mobile + desktop
- Toasts / error handling

If tests exist or are added:

- Update tests for modified logic/components
- Ensure `npm test` passes (if/when configured)

Backend quick check (when backend is impacted):

```bash
# run inside ./backend
npm start
```

## Dependency Management

- Add packages only when necessary.
- Prefer lightweight dependencies.
- When adding a dependency:
  - Explain why in the PR
  - Confirm bundle impact is reasonable

## Where to Put New Code

- **New page/route**: `frontend/src/pages/` + route entry in `frontend/src/App.tsx`
- **Reusable component**: `frontend/src/components/`
- **UI primitive**: `frontend/src/components/ui/` (prefer shadcn)
- **API calls**: `frontend/src/services/` using `frontend/src/lib/httpClient.ts`
- **Schemas**: `frontend/src/lib/validation.ts`
- **Utilities**: `frontend/src/utils/`

## Pull Request / Review Checklist

Before finishing:

- Code is typed, readable, and minimal
- Lint/typecheck/build/dev run clean
- UI is responsive and accessible
- Error and loading states are handled
- No secrets committed
- Commit messages are atomic and descriptive

## Resources

- shadcn/ui: https://ui.shadcn.com/
- Tailwind CSS: https://tailwindcss.com/docs
- Radix UI: https://www.radix-ui.com/primitives
- React Hook Form: https://react-hook-form.com/
- Zod: https://zod.dev/
- React Router: https://reactrouter.com/
- Vite: https://vite.dev/
- AGENTS.md standard: https://agents.md/
