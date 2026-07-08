# 01 - Data layer

A Genesis app reads and writes its Taskade project rows through the data
gateway at relative `/api/taskade/*` paths. The Director proxy injects the
gateway token server-side; the app never handles credentials. Always use the
typed helpers - never hand-roll gateway URLs.

## Project rows: `@/lib/genesis-data`

```ts
import {
  getNodes, createNode, updateNode, deleteNode,
  getFieldValue, getFieldNumber,
} from '@/lib/genesis-data';

const rows = await getNodes(PROJECT_ID);                       // GenesisNode[]
const status = getFieldValue(rows[0], 'Status');               // string | null
const score = getFieldNumber(rows[0], 'Score') ?? 0;           // number, never NaN
await createNode(PROJECT_ID, { Name: 'Maria', Status: 'New', parentId: rows[0].id });
await updateNode(PROJECT_ID, rows[0].id, { Status: 'Contacted' }); // partial update
await deleteNode(PROJECT_ID, rows[0].id);
```

`GenesisNode`: `{ id: string; fieldValues: Record<string, string>; parentId: string | null }`.

- `getNodes` returns ALL rows as one FLAT array. In a flat database (the common
  case) every row has `parentId === null` - use the array as-is. NEVER filter by
  `parentId` to find data rows: `rows.filter((r) => r.parentId !== null)` returns
  an empty list and renders a blank app.
- Read fields with `getFieldValue(row, ...keys)` / `getFieldNumber(row, ...keys)`,
  not by indexing `fieldValues` directly. They fall back across multiple keys
  (pass display name first, then field path) and `getFieldNumber` coerces safely
  (null, never `NaN`, for missing or non-numeric values).

## Field keys: display name vs field path (the compat gotcha)

Each field value in `fieldValues` is emitted under BOTH keys when possible:

| Key form | Example | When present |
|---|---|---|
| Field path | `/attributes/fields.1` | always (stable, internal) |
| Display name | `Status` | only when the name is non-empty, UNIQUE across the project's fields, and not itself a field path |

Consequences:

- Two columns both named `Status` = ambiguous: the display-name key disappears
  and only the field paths remain. Reads of `fieldValues['Status']` silently
  return `undefined`.
- Writes accept either key form. Matching is exact (case- and
  whitespace-sensitive). Unknown or ambiguous keys are SILENTLY DROPPED, not
  errored - a misspelled field name looks like a successful write that changed
  nothing.
- Prefer display names for readability; keep project field names unique.

## Automations: `@/lib/genesis-flows`

```ts
import { submitForm, runFlow } from '@/lib/genesis-flows';

await submitForm(FLOW_ID, { name: 'Maria', email: 'maria@acme.com' }); // FORM-trigger flow
await runFlow(FLOW_ID, { orderId: '789' });                            // WEBHOOK/MANUAL-trigger flow
```

Both return `{ flowRunId?: string }`. A WEBHOOK flow ending in an "HTTP
response" action returns that body synchronously (then `flowRunId` is
undefined); a non-2xx or non-JSON synchronous body throws.

## Per-user data

- Wrapped in `<GenesisAuth>` (see `HOW_TO_USE.md`), the signed-in end-user's
  identity is attached to gateway calls automatically (`gateway-auth.tsx`
  patches fetch/XHR for same-origin gateway URLs only). Do not set
  Authorization headers yourself.
- The gateway delegates per-row authorization to the app by default. Client
  code (e.g. `filterByOwner`) only changes what is RENDERED - the full row set
  still reaches the browser. Real per-user privacy requires gateway row
  scoping, enabled by the Taskade team; with it ON, `getNodes` already returns
  only the verified user's rows.

## Third-party APIs with keys: `GenesisClient.proxy()`

Never embed an API key in app code. The proxy resolves a named Workspace
Secret server-side and substitutes the literal `{{secret}}` placeholder:

```ts
import { GenesisClient } from '@taskade/genesis-client';

const taskade = new GenesisClient({ spaceId: SPACE_ID });
const res = await taskade.proxy({
  secretAlias: 'openai', // key name saved in Space Settings -> Secrets
  url: 'https://api.openai.com/v1/chat/completions',
  method: 'POST',
  headers: { Authorization: 'Bearer {{secret}}' },
  body: { model: 'gpt-4o-mini', messages: [{ role: 'user', content: 'Hi' }] },
});
const data = await res.json();
```

Returns a normal `Response` for both 2xx and non-2xx upstream statuses; branch
on `res.ok`. Use the proxy for any keyed third-party API; skip it for public
open-data endpoints and for Taskade-internal calls (those use the helpers
above). Tell the user to add the secret under Space Settings -> Secrets with
the exact `secretAlias` name before the feature can work.
