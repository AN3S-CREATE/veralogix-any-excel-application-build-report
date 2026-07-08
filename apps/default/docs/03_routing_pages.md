# 03 - Routing and pages

`react-router-dom` v6 is bundled. Use `BrowserRouter` + `Routes` + `Route`.
Published apps serve `index.html` for every non-asset path, so deep links and
refreshes work.

## App shell pattern

`src/App.tsx` is the root (it ships empty - build here). Keep it thin: router,
shared layout, page routes.

```tsx
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { FloatingAgentChat } from '@/components/blocks';
import { AppShell } from '@/components/AppShell';
import { HomePage } from '@/pages/HomePage';
import { SettingsPage } from '@/pages/SettingsPage';

export default function App() {
  return (
    <BrowserRouter>
      <AppShell>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/settings" element={<SettingsPage />} />
        </Routes>
      </AppShell>
      <FloatingAgentChat agentId={AGENT_ID} publicAgentId={PUBLIC_AGENT_ID} />
    </BrowserRouter>
  );
}
```

`AppShell` is your hand-authored layout component (header/nav/sidebar wrapping
`children`) - compose it from `ui/` primitives (`sidebar`, `sheet`, `tabs`,
`navigation-menu`). Mount app-wide chrome (FloatingAgentChat, sonner
`<Toaster />`) once here, not per page.

## Adding a page

1. Create `src/pages/NewPage.tsx` (named export, explicit props).
2. Add `<Route path="/new" element={<NewPage />} />` in `App.tsx`.
3. Link with `<Link to="/new">` or `useNavigate()` - never `<a href>` for
   internal navigation (full reload loses state).

## File organization

| Dir | Contents |
|---|---|
| `src/pages/` | route pages |
| `src/components/` | reusable components (yours; `ui/` and `blocks/` are read-only) |
| `src/hooks/` | custom hooks (data fetching per `docs/01_data_layer.md`) |
| `src/stores/` | zustand stores (`createPersistentStore` for localStorage persistence) |
| `src/lib/` | utilities (pre-wired SDKs live here - do not rewrite them) |

## Reserved paths

Do not define routes that shadow platform paths: `/api/taskade/*` (data
gateway), `/_taskade/*` (internal API), `/_genesis/*` (auth). Client routes
never intercept these (they are network requests), but do not create page
routes at those paths either.
