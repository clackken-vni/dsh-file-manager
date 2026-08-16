# dsh-file-manager

**File Manager cho DeepSeek Harness** — bảng file/thư mục bên phải trang (có thể kéo đổi độ rộng), tìm kiếm tên file đệ quy, preview nội dung (Markdown + syntax highlight), chỉnh sửa inline, và **context-menu (bấm chuột phải)** trên file/folder gồm: Preview / Edit / Copy path / Rename / New file / New folder / Delete / Open with app / Reveal in Finder / Open in VS Code.

Plugin là **dual-face** (host + client) và cài được qua `dsh plugin add` — không cần sửa repo, không đụng RPC đóng.
Host half đăng ký các route `/plugins/file-manager/*` trên `ctx.webServer`; client half fetch trực tiếp các route này từ trang origin.

## Tính năng

- **Cây file/folder** bên phải, mở rộng/collapse từng thư mục (lazy-load), thư mục xếp trước file, hiển thị kích thước.
- **Tìm kiếm tên** đệ quy trong workspace (bỏ qua `.git`/`node_modules`/`dist`/`.dsh`, giới hạn kết quả).
- **Right-click context menu** trên bất kỳ file/folder nào:
  - File: `Preview`, `Edit`, `Copy path`, `Rename…`, `Delete`, `Open with app`, `Reveal in Finder`, `Open in VS Code`
  - Folder: `Expand/Collapse`, `Copy path`, `Rename…`, `New file`, `New folder`, `Delete`, `Open with app`, `Reveal in Finder`
- **Preview**: Markdown render (heading, list, code fence, blockquote, bảng, ảnh, link) + text/source hiển thị kèm syntax highlight cơ bản; chặn file > 1 MB.
- **Edit inline** rồi Save, ghi ngược về đĩa.
- Gắn nút toggle trên header của session và panel `shell.overlay`.

## Cấu trúc

```
dsh-file-manager/
├── package.json          # dual-face: dsh.bundle.patch + dsh.client (platform web)
├── cordis.patch.yml      # - insert: [{id: file-manager, name: dsh-file-manager}]
├── lib/
│   ├── index.js          # HOST HALF (prebuilt) — đăng ký /plugins/file-manager/* routes
│   └── client.js         # CLIENT HALF (prebuilt bundle) — __ModuleLoader__.load + React
└── README.md
```

### Host half (`lib/index.js`)
`inject: ['fs']`. Đăng ký các route (tốt nhất qua `ctx.get('webServer') ?? ctx.get('httpServer')`):

| Route | Method | Mô tả |
|---|---|---|
| `/plugins/file-manager/list` | GET `?path=` | Liệt kê file+thư mục một cấp, sắp xếp |
| `/plugins/file-manager/search` | GET `?root=&q=` | Tìm tên đệ quy, skip thư mục dày |
| `/plugins/file-manager/read` | GET `?path=` | Đọc text (giới hạn 1 MB) |
| `/plugins/file-manager/write` | POST | Ghi/create-or-replace file |
| `/plugins/file-manager/rename` | POST | Đổi tên / move |
| `/plugins/file-manager/delete` | POST | Xoá file/thư mục đệ quy |
| `/plugins/file-manager/mkdir` | POST | Tạo thư mục |
| `/plugins/file-manager/touch` | POST | Tạo file rỗng |
| `/plugins/file-manager/open` | POST | Mở bằng app mặc định OS |
| `/plugins/file-manager/reveal` | POST | Mở thư mục cha bằng app OS |
| `/plugins/file-manager/open-vscode` | POST | Mở bằng VS Code (`code`) |

Đọc/ghi đi qua `ctx.fs` (respect provider/sandbox); rename/delete/mkdir/touch/open là cấu trúc `ctx.fs` chủ tâm không cung cấp nên dùng `node:fs` trên chính path host sở hữu (client không tự ghép path segments).

### Client half (`lib/client.js`)
Bundle prebuilt theo contract `window.__ModuleLoader__.load({id, factory})`, `require('react')`, dùng `createElement` (không JSX), tự inject CSS. Đăng ký:

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

Root được suy ra từ active workspace qua `props.useWorkspaces` / `props.useSessions` (framework hooks); re-root khi đổi workspace.

## Cài đặt & chạy

Từ thư mục chứa `package.json` (hoặc npm package) dùng lệnh:

```sh
# Cài từ đường dẫn thư mục local
dsh plugin --profile web add /path/to/dsh-file-manager

# hoặc nếu đăng npm
dsh plugin --profile web add dsh-file-manager
```

Lệnh `dsh plugin add` sẽ pnpm-install gói vào profile và nạp bundle `dsh.profile.bundles`. Khởi động lại harness để có hiệu lực.

> **Cần** VS Code `code` trên PATH cho "Open in VS Code"; nếu không có, mục này báo lỗi nhưng các tính năng khác vẫn dùng được.

## Tuỳ biến / nâng cấp

- **Đổi phạm vi root**: host half luôn nhận path từ client (client chọn root = workspace). Muốn khóa root deployment-wide, thêm `this.mountRoot` config trong host half và kiểm tra path.
- **Preview more formats**: mở rộng `isTextable` / thêm render riêng từng định dạng.
- **Build lại client**: file `lib/client.js` hiện là bundle prebuilt; nếu bạn muốn build từ TSX bằng pipeline của DSH, theo `packages/client/tsdown.client.ts` (`clientBundle(...)`), export `./\client` => `lib/client.js`.

## Bảo mật

- Client chỉ fetch các route `/plugins/file-manager/*` từ origin `/` (cùng web server). Host half trust the same connection fence như GUI.
- Không intent-safe hóa; plugin chạy với đặc quyền của tiến trình dsh. Chỉ cài trong deployment bạn tin tưởng; expose remote (`--host`) vẫn nên tránh vì RCE surface chung.