# dsh-file-manager

**A File Manager for DeepSeek Harness.** Adds a resizable file/folder panel on the right side of the page with recursive filename search, per-type preview, inline editing, and a full right-click context menu for files and folders.

Docs in other languages: [Tiếng Việt](README.vi.md)

## Highlights

- **Dual-face plugin** — works as both a DSH host plugin and a web client. Installable via `dsh plugin add` with no repo edits and no changes to closed RPCs.
  - Host half registers the `/plugins/file-manager/*` routes on `ctx.webServer`.
  - Client half fetches those routes directly (same origin).
- **File tree** on the right side — lazy-load expand/collapse per folder, directories before files, size shown, sortable (Name / Type / Size / Modified).
- **Recursive filename search** across the whole workspace (skips `.git`, `node_modules`, `dist`, `.dsh`; caps results).
- **Right-click context menu** on any file/folder.
- **Per-type preview** — renders each file the right way:
  - Markdown → markdown rendering
  - HTML / SVG → sandboxed in-browser iframe
  - PDF → embedded browser viewer
  - Images → inline image
  - Audio / Video → native media player with controls
  - Text / code → syntax highlighting
- **Inline edit** then Save back to disk.
- **20 color themes** → 10 dark + 10 light, plus per-file-type icons.
- **Breadcrumb navigation**, **prev/next** quick file switching in preview, **rubber-band drag-select**, keyboard shortcuts.

## Installation

```sh
# From a local folder or an npm package:
dsh plugin --profile web add /path/to/dsh-file-manager
# or from npm:
dsh plugin --profile web add dsh-file-manager
```

`dsh plugin add` pnpm-installs the package into the profile and reconciles it into the profile's bundle list. Restart the harness for it to take effect.

> **Requires** VS Code `code` on PATH for "Open in VS Code"; if missing, that item reports an error but everything else still works.

## Structure

```
dsh-file-manager/
├── package.json          # dual-face: dsh.bundle.patch + dsh.client (platform web)
├── cordis.patch.yml      # - insert: [{id: file-manager, name: dsh-file-manager}]
├── lib/
│   ├── index.js          # HOST HALF (prebuilt) — /plugins/file-manager/* routes
│   └── client.js         # CLIENT HALF (prebuilt bundle) — __ModuleLoader__.load + React
└── README.md
```

### Host half (`lib/index.js`)

`inject: ['fs']`. Registers routes (preferably via `ctx.get('webServer') ?? ctx.get('httpServer')`):

| Route | Method | Description |
|---|---|---|
| `/plugins/file-manager/list` | GET `?path=` | List one directory level, sorted |
| `/plugins/file-manager/search` | GET `?root=&q=` | Recursive filename search, skips dense dirs |
| `/plugins/file-manager/read` | GET `?path=` | Read text (up to 1 MB) |
| `/plugins/file-manager/raw` | GET `?path=` | Stream arbitrary binary with correct MIME (pdf/html/image/video/audio) |
| `/plugins/file-manager/download` | GET `?path=` | Download as attachment |
| `/plugins/file-manager/write` | POST | Create-or-replace a file |
| `/plugins/file-manager/rename` | POST | Rename / move |
| `/plugins/file-manager/delete` | POST | Recursive delete file/folder |
| `/plugins/file-manager/mkdir` | POST | Create directory |
| `/plugins/file-manager/touch` | POST | Create empty file |
| `/plugins/file-manager/open` | POST | Open with the default OS app |
| `/plugins/file-manager/reveal` | POST | Reveal in the parent folder (OS app) |
| `/plugins/file-manager/open-vscode` | POST | Open in VS Code (`code`) |

Reads/writes go through `ctx.fs` (respects the provider/sandbox). Rename/delete/mkdir/touch/open are operations `ctx.fs` intentionally does not expose, so they use `node:fs` on paths the host owns (the client never joins path segments itself).

### Client half (`lib/client.js`)

Prebuilt bundle following the contract `window.__ModuleLoader__.load({id, factory})`, `require('react')`, `createElement` (no JSX), and self-injected CSS. Registers:

```js
slots.inject('shell.overlay', () => slots.register(
  { name: 'shell.overlay', id: 'file-manager', order: 90, label: 'file-manager' },
  (props) => react.createElement(ExplorerPanel, props),
));
slots.inject('conversation.session.header.actions', () => slots.register(
  { name: 'conversation.session.header.actions', id: 'file-manager-toggle', order: 30, label: 'file-manager' },
  (props) => react.createElement(ToggleButton, props),
));
```

The root is derived from the active workspace via the framework hooks (`props.useWorkspaces` / `props.useSessions`) and re-roots when the workspace changes.

## Context menu

- **File:** Preview · Edit · Copy path · Download · Rename… · Delete · Open with app · Reveal in Finder · Open in VS Code
- **Folder:** Expand/Collapse · Copy path · Rename… · New file · New folder · Delete · Open with app · Reveal in Finder

## Customization

- **Lock the workspace root:** the host half always takes a path from the client (client picks root = workspace). To enforce a deployment-wide root, add a `mountRoot` config to the host half and gate paths against it.
- **Add more preview formats:** extend the type dispatch in `lib/client.js`.
- **Rebuild the client:** `lib/client.js` is currently a hand-authored prebuilt bundle. To build from TSX with the DSH pipeline, follow `packages/client/tsdown.client.ts` (`clientBundle(...)`) and export `./client` => `lib/client.js`.

## Security

- The client only fetches the `/plugins/file-manager/*` routes from the origin `/` (the web server it was loaded from). The host half trusts the same connection fence as the GUI.
- This is **not** intent-safe. The plugin runs with the privileges of the `dsh` process. Only install it in deployments you trust; exposing it remotely (`--host`) is discouraged because of the shared RCE surface.
- Dense/generated directories (`node_modules`, `dist`, `.git`) are skipped during search to avoid hangs on huge trees.

## License

[MIT](LICENSE)