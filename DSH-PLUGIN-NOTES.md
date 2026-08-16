# DSH Plugin — Notes for Future Work

Kiến thức đúc kết từ quá trình làm `dsh-file-manager`. Dùng làm checklist khi viết plugin DSH mới (dual-face: host + web client).

> Bản tiếng Anh đầy đủ nên đọc kèm `README.md`. Tài liệu này ghi lại các **bẫy/chuẩn đã tìm ra thực nghiệm.**

## 1. Cấu trúc tối thiểu

```
my-plugin/
├── package.json          # bắt buộc dsh.bundle.patch (+ dsh.client nếu có web client)
├── cordis.patch.yml      # - insert: [{id: xxx, name: <package-name>}]
├── index.js              # HOST half — apply(ctx), inject:['fs'], đăng ký /plugins/<name>/*
└── lib/client.js         # CLIENT half — window.__ModuleLoader__.load({id, factory})
```

## 2. `package.json` — ĐÚNG CHUẨN (đã kiểm chứng với source harness)

```jsonc
{
  "name": "dsh-file-manager",
  "type": "module",
  "main": "./index.js",                      // host entry
  "exports": {
    ".": "./index.js",
    "./client": "./lib/client.js",           // client bundle
    "./cordis.patch.yml": "./cordis.patch.yml",
    "./package.json": "./package.json"
  },
  "files": ["index.js", "lib", "cordis.patch.yml", "README.md", "LICENSE"],

  "dsh": {                                   // == key chính yếu, CLI đọc để nhận là bundle ==
    "bundle": { "patch": "./cordis.patch.yml" },
    "client": {
      "platform": "web",
      "inject": ["@deepseek-ai/dsh-client-runtime", "@deepseek-ai/dsh-client-ui-slots"]
    }
  },
  "license": "MIT"
}
```

## 3. ⚠️ ĐỪNG khai `@deepseek-ai/*` trong `peerDependencies`

- **Nguyên nhân lỗi:** khai `peerDependencies: { "@deepseek-ai/dsh-client-runtime": "^0.0.1-rc.1" }` làm `pnpm install` thử cài nó → nó kéo theo `@deepseek-ai/dsh-compact` **không public trên npm** → `ERR_PNPM_FETCH_404`.
- **Cách đúng:** các external `@deepseek-ai/*` được **runtime cung cấp sẵn (module table)** — KHÔNG phải package để cài. Chỉ cần liệt chúng trong **`dsh.client.inject`**, **không** đặt vào `peerDependencies`/`dependencies`.
- Ví dụ plugin cộng đồng cài được (`workspace-files-explorer`) cũng **không có** `peerDependencies`.

## 4. Cách cài — 3 kiểu

| Kiểu | Lệnh | Ghi chú |
|---|---|---|
| **GitHub** | `dsh plugin --profile web add github:OWNER/REPO` | ✅ chạy tốt; đọc branch mặc định (main) |
| **npm** | `dsh plugin --profile web add dsh-file-manager@latest` | chỉ chạy sau khi `@deepseek-ai/*` public; hiện fail do private |
| **local dev** | `dsh plugin --profile web add /path/to/plugin` | → ghi `file:`/`link:` trong profile package.json |

Sau lệnh add/update **PHẢI restart `dsh web`** — bundle nạp lúc boot, không hot-reload.

## 5. Điều chỉnh host half (nếu đổi `index.js`) cần RESTART; đổi client (`lib/client.js`) chỉ cần hard-refresh

- Host half nạp lúc boot → sửa host buffer phải khởi động lại server.
- Client bundle được serve tươi từ đĩa (byte-identical) → hard-refresh trang là đủ.

## 6. Cách publish npm

```sh
# chuẩn bị: LICENSE, package.json (author/homepage/repository/keywords/engines)
# CI workflow: .github/workflows/publish.yml → publish npm khi push tag v*
git tag v0.1.x && git push origin v0.1.x
# CI chạy `pnpm publish --access public --no-git-checks`
# NPM_TOKEN secret TẮT bắt buộc cho bước publish
```

## 7. Chuẩn client bundle (contract)

- `window.__ModuleLoader__.load({ id, factory: (require) => {...} })`
- `const react = require('react')` — không JSX, dùng `react.createElement` thuần.
- Inject CSS bằng `<style data-plugin="<id>" data-plugin-css="<id>/css">` — **2 attribute này**, loader dọn theo `data-plugin`, guard idempotent theo `data-plugin-css`.
- Đăng ký UI qua `slots.inject('<slot-name>', () => slots.register({name, id, order, label}, (props)=>...))`.
- Slot chuẩn đã dùng: `shell.overlay` (list, root), `conversation.session.header.actions` (list, session).

## 8. Bẫy hay gặp đã gặp

- `fs.resolve(path)` trả `string` HOẶC `{targetKey, displayPath}` → normalize trước node:fs ops.
- `ctx.get('webServer') ?? ctx.get('httpServer')` để đăng ký route (ưu tiên web).
- API proxy: `ctx.apiProxy.host.openPath(request, signal)` — response đọc `r.result.ok`.
- `subprocess.resolveExecutable('code')` dùng để tìm VS Code.

## 9. Nguồn xác minh chuẩn (trong repo harness)

- `apps/cli/src/plugin.ts` — cơ chế `dsh plugin` (reconcile bundle theo `dsh.bundle.patch`).
- `packages/bundle/{base,web-app}/package.json` — bundle template chuẩn.
- `packages/session-query/session-log-export/`, `packages/client/ui-theme/` — file package có `dsh.client`.
- `packages/client/tsdown.client.ts` — pipeline client bundle + CSS injection.