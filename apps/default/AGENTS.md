# Agent contract

Non-negotiables for any agent editing this app. Details live in `docs/`; read
a chapter only when you need it.

## Hard rules

1. Work ONLY in `src/`. Never modify `src/main.tsx`, config files, or anything
   outside `src/`.
2. Verify before import. If a path or package is not in this tree or
   `package.json`, it does not exist - do not import it. No new dependencies.
3. NEVER edit files under `src/components/ui/` or `src/components/blocks/`.
   Theme via `src/index.css` tokens; wrap primitives in your own components.
4. ThemeProvider (next-themes, `attribute="class"`, default dark) is
   pre-mounted in `main.tsx`. Do NOT mount a second one; toggle with
   `useTheme()`.
5. Color via semantic tokens only (`bg-card`, `text-muted-foreground`, ...).
   No literal palette classes, no raw hex. Chart classes stay literal
   (`bg-chart-1` ... `bg-chart-5`), never computed strings.
6. Data via the gateway helpers, never hand-rolled endpoints:
   `getNodes/createNode/updateNode/deleteNode` from `@/lib/genesis-data`,
   `submitForm/runFlow` from `@/lib/genesis-flows`. Rows arrive FLAT (do not
   filter by `parentId`); read fields with `getFieldValue`/`getFieldNumber`,
   never by indexing `fieldValues` directly.
7. Secrets stay server-side: third-party keyed APIs go through
   `GenesisClient.proxy()` (`@taskade/genesis-client`) with `{{secret}}`
   substitution. Never embed a key.
8. Agent chat: use `<FloatingAgentChat agentId publicAgentId? />` from
   `@/components/blocks`, or the SDK v2 two-component split. `useChat` crashes
   on `undefined` chat.
9. Auth, when needed: wrap with `<GenesisAuth>` from `@/lib/genesis-auth`.
   Never build custom login flows.

## Read more (on demand)

| Topic | File |
|---|---|
| Project rows, field names, flows, secret proxy | `docs/01_data_layer.md` |
| Tokens, dark mode, chart vars | `docs/02_theming.md` |
| Router, pages, app shell | `docs/03_routing_pages.md` |
| Agent chat wiring + ids | `docs/04_agent_chat.md` |
| Preview vs published behavior | `docs/05_deployment_publish.md` |
| Components map / block props | `src/components/README.md`, `src/components/blocks/README.md` |
| Comprehensive guide | `docs/HOW_TO_USE.md` |
