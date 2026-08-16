# dsh-file-manager

**File Manager cho DeepSeek Harness** — bảng file/thư mục có thể điều chỉnh độ rộng nằm bên phải trang, kèm tìm kiếm tên file đệ quy, preview theo đúng loại file, chỉnh sửa inline, và context-menu đầy đủ (bấm chuột phải) trên file/folder.

> 📖 Bản tiếng Anh: [README.md](README.md) · 📦 Package npm: [dsh-file-manager](https://www.npmjs.com/package/dsh-file-manager)

## Tính năng nổi bật

- **Plugin dual-face** — vừa là plugin host vừa là client web; cài được qua `dsh plugin add`, không cần sửa repo, không đụng RPC đóng.
  - Host half đăng ký các route `/plugins/file-manager/*` trên `ctx.webServer`.
  - Client half fetch trực tiếp các route đó (cùng origin).
- **Cây file/folder** bên phải — lazy-load, expand/collapse từng thư mục, thư mục xếp trước file, hiện kích thước, sắp xếp theo (Name / Type / Size / Modified).
- **Tìm kiếm đệ quy** toàn workspace (bỏ qua `.git`, `node_modules`, `dist`, `.dsh`; giới hạn kết quả).
- **Context-menu (chuột phải)** trên mọi file/folder.
- **Preview theo đúng loại file:**
  - Markdown → render markdown
  - HTML / SVG → hiển thị trong iframe sandbox (như trình duyệt)
  - PDF → trình xem PDF nhúng
  - Ảnh → hiển thị ảnh trực tiếp
  - Audio / Video → trình phát media native kèm controls
  - Text / code → tô màu cú pháp
- **Chỉnh sửa inline** rồi Save lại đĩa.
- **20 theme màu** → 10 tối + 10 sáng, kèm icon theo loại file.
- **Điều hướng breadcrumb**, **prev/next** chuyển file nhanh trong preview, **kéo-chuột chọn hàng loạt** (rubber-band), phím tắt.

## Cài đặt

```sh
# Từ thư mục local hoặc npm package:
dsh plugin --profile web add /path/to/dsh-file-manager
# hoặc từ npm:
dsh plugin --profile web add dsh-file-manager
```

Lệnh `dsh plugin add` pnpm-install gói vào profile và nạp vào danh sách bundle. Khởi động lại harness để có hiệu lực.

> **Cần** VS Code `code` trên PATH cho "Open in VS Code"; nếu thiếu, mục đó báo lỗi nhưng các tính năng khác vẫn dùng được.

## Cấu trúc

```
dsh-file-manager/
├── package.json          # dual-face: dsh.bundle.patch (host bundle) + dsh.client (web client)
├── cordis.patch.yml      # - insert: [{id: file-manager, name: dsh-file-manager}]
├── lib/
│   ├── index.js          # HOST HALF (prebuilt) — /plugins/file-manager/* routes
│   └── client.js         # CLIENT HALF (prebuilt bundle) — __ModuleLoader__.load + React
└── README.md
```

### Host half (`lib/index.js`)

`inject: ['fs']`. Đăng ký các route (tốt nhất qua `ctx.get('webServer') ?? ctx.get('httpServer')`):

| Route | Phương thức | Mô tả |
|---|---|---|
| `/plugins/file-manager/list` | GET `?path=` | Liệt kê một cấp thư mục, sắp xếp |
| `/plugins/file-manager/search` | GET `?root=&q=` | Tìm tên đệ quy, bỏ qua thư mục dày |
| `/plugins/file-manager/read` | GET `?path=` | Đọc text (giới hạn 1 MB) |
| `/plugins/file-manager/raw` | GET `?path=` | Stream file nhị phân với MIME đúng (pdf/html/image/video/audio) |
| `/plugins/file-manager/download` | GET `?path=` | Tải file dạng attachment |
| `/plugins/file-manager/write` | POST | Tạo hoặc ghi đè file |
| `/plugins/file-manager/rename` | POST | Đổi tên / di chuyển |
| `/plugins/file-manager/delete` | POST | Xoá đệ quy file/thư mục |
| `/plugins/file-manager/mkdir` | POST | Tạo thư mục |
| `/plugins/file-manager/touch` | POST | Tạo file rỗng |
| `/plugins/file-manager/open` | POST | Mở bằng app mặc định OS |
| `/plugins/file-manager/reveal` | POST | Mở thư mục cha bằng app OS |
| `/plugins/file-manager/open-vscode` | POST | Mở bằng VS Code (`code`) |

Đọc/ghi đi qua `ctx.fs` (theo provider/sandbox). Rename/delete/mkdir/touch/open là những thao tác `ctx.fs` chủ tâm không cung cấp nên dùng `node:fs` trên path host sở hữu (client không tự ghép path segments).

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

Root được suy từ workspace đang kích hoạt qua framework hooks (`props.useWorkspaces` / `props.useSessions`) và re-root khi đổi workspace.

## Context menu

- **File:** Preview · Edit · Copy path · Download · Rename… · Delete · Open with app · Reveal in Finder · Open in VS Code
- **Folder:** Expand/Collapse · Copy path · Rename… · New file · New folder · Delete · Open with app · Reveal in Finder

## Tuỳ biến

- **Khoá workspace root:** host half luôn nhận path từ client (client chọn root = workspace). Muốn khoá root toàn deployment, thêm config `mountRoot` trong host half và kiểm tra path.
- **Thêm định dạng preview:** mở rộng nhánh phân loại trong `lib/client.js`.
- **Build lại client:** `lib/client.js` hiện là bundle prebuilt viết tay. Muốn build từ TSX bằng pipeline của DSH, theo `packages/client/tsdown.client.ts` (`clientBundle(...)`) và export `./client` => `lib/client.js`.

## Bảo mật

- Client chỉ fetch các route `/plugins/file-manager/*` từ origin `/` (web server nạp nó). Host half dựa trên cùng tường lửa kết nối với GUI.
- Plugin **không intent-safe**: chạy với đặc quyền của tiến trình `dsh`. Chỉ cài trong deployment bạn tin tưởng; tránh expose remote (`--host`) vì RCE surface dùng chung.
- Khi tìm kiếm, bỏ qua các thư mục dày/được sinh tự động (`node_modules`, `dist`, `.git`) để tránh treo với cây khổng lồ.

## Giấy phép

[MIT](LICENSE)