/**
 * dsh-file-manager — client half (prebuilt bundle).
 *
 * Registers a right-side resizable file/folder panel in `shell.overlay` plus a
 * toggle button in `conversation.session.header.actions`. Provides a file tree,
 * recursive filename search, right-click context menu (preview / copy path /
 * rename / delete / new file / new folder / open with app / reveal / open in
 * VS Code), and a content preview (markdown + basic syntax highlighting) with
 * inline editing that writes back to disk.
 *
 * DSH client-bundle contract: calls `window.__ModuleLoader__.load({id, factory})`,
 * resolves react/plugins through the injected require, uses createElement only
 * (no JSX). Routes are fetched from the host `/plugins/file-manager/*`.
 */

window.__ModuleLoader__.load({
  id: 'dsh-file-manager',
  factory: (require) => {
    var module = { exports: {} };
    var exports = module.exports;
    Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });
    var react = require('react');

    // ========================= styles =========================
    const CSS = `
html{--fm-panel-width:340px;--fm-shift:calc(var(--fm-panel-width) + 14px);--fm-text:#ece8ff;--fm-text-sec:#b8b0e8;--fm-text-mut:#8b84b8;--fm-border:rgba(206,198,255,.16);--fm-code-bg:rgba(12,9,30,.72);--fm-brand:#a89bff;--fm-bg:linear-gradient(178deg,#2a2350 0%,#1c1836 26%,#131026 55%,#0b0918 100%);--fm-bg-rail:linear-gradient(160deg,#2a2350,#120e28 80%);--fm-bg-rail-hover:linear-gradient(160deg,#3a2f6e,#1a1540 80%);--fm-bg-reader:linear-gradient(180deg,#241d44 0%,#161233 30%,#0a0816 100%);--fm-bg-context:linear-gradient(170deg,#2a2450,#161233 90%);--fm-bg-toast:linear-gradient(165deg,#2a2450,#161233 90%);--fm-accent:rgba(139,124,255,.28);--fm-accent-hover:rgba(139,124,255,.5);--fm-accent-strong:rgba(170,160,255,.6);--fm-icon:rgba(207,201,255,.75);--fm-icon-hover:#fff;--fm-row-hover:linear-gradient(90deg,rgba(139,124,255,.14),rgba(139,124,255,.04));--fm-row-selected:linear-gradient(90deg,rgba(139,124,255,.22),rgba(139,124,255,.08));--fm-input-bg:rgba(10,8,24,.5);--fm-glow:rgba(80,60,200,.4);--fm-rail-glow:rgba(80,60,200,.45);--fm-top-accent:rgba(180,170,255,.6)}
html[data-fm-open] [data-phase=active]{box-sizing:border-box;padding-right:var(--fm-shift)}
[data-phase=active]{will-change:padding-right}
.fm-panel{position:fixed;top:0;right:0;bottom:0;z-index:100;display:flex;flex-direction:column;background:var(--fm-bg);-webkit-backdrop-filter:blur(18px) saturate(1.35);backdrop-filter:blur(18px) saturate(1.35);border-left:1px solid var(--fm-accent);border-top-left-radius:14px;border-bottom-left-radius:14px;box-shadow:-12px 0 40px -8px var(--fm-glow),inset 0 0 0 1px rgba(255,255,255,.04),inset 1px 0 0 var(--fm-accent-strong);color:var(--fm-text);font-size:13px;line-height:1.45;width:var(--fm-panel-width,340px);min-width:200px;max-width:calc(100vw - 80px);pointer-events:auto;box-sizing:border-box;overflow:hidden;-webkit-user-select:none;user-select:none;-webkit-user-drag:none}
.fm-panel *{box-sizing:border-box}
.fm-panel::before{content:"";position:absolute;top:0;left:0;right:0;height:1px;background:linear-gradient(90deg,transparent,var(--fm-top-accent) 50%,transparent);pointer-events:none}
.fm-rail{position:fixed;top:50%;right:0;transform:translateY(-50%);z-index:100;width:24px;height:64px;display:flex;align-items:center;justify-content:center;border:1px solid var(--fm-accent);border-right:none;border-radius:12px 0 0 12px;background:var(--fm-bg-rail);-webkit-backdrop-filter:blur(14px);backdrop-filter:blur(14px);color:var(--fm-text-sec);box-shadow:-6px 0 18px -6px var(--fm-rail-glow);cursor:pointer;box-sizing:border-box}
.fm-rail:hover{background:var(--fm-bg-rail-hover);color:var(--fm-icon-hover);border-color:var(--fm-accent-hover)}
.fm-resize{position:absolute;left:0;top:0;bottom:0;width:6px;cursor:col-resize;z-index:5}
.fm-resize:hover{background:var(--fm-brand);opacity:.35}
.fm-drag-capture{position:fixed;inset:0;z-index:9999;cursor:col-resize;background:transparent}
.fm-band{position:fixed;z-index:850;border:1px solid var(--fm-accent-strong);background:var(--fm-accent-hover);border-radius:2px;pointer-events:none;box-shadow:0 0 0 1px rgba(0,0,0,.06)}
.fm-header{display:flex;align-items:center;gap:4px;padding:10px 10px 8px;border-bottom:1px solid var(--fm-border)}
.fm-header-title{flex:1;font-weight:600;font-size:13px;display:flex;align-items:center;gap:6px;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.fm-icon-btn{display:flex;align-items:center;justify-content:center;width:26px;height:26px;padding:0;border:none;border-radius:6px;background:transparent;color:var(--fm-icon);cursor:pointer;flex:none}
.fm-icon-btn:hover{background:var(--fm-accent-hover);color:var(--fm-icon-hover)}
.fm-search{display:flex;align-items:center;gap:6px;padding:8px 10px;border-bottom:1px solid var(--fm-border)}
.fm-search input{flex:1;min-width:0;background:var(--fm-input-bg);border:1px solid var(--fm-accent);border-radius:8px;color:var(--fm-text);padding:4px 8px;font-size:12px;outline:none;transition:border-color .15s}
.fm-search input:focus{border-color:var(--fm-accent-strong)}
.fm-search-input{position:relative;flex:1;display:flex;align-items:center;min-width:0}
.fm-search-clear{position:absolute;right:4px;top:50%;transform:translateY(-50%);width:16px;height:16px;padding:0;border:none;border-radius:50%;background:transparent;color:var(--fm-text-sec);cursor:pointer;font-size:15px;line-height:1;display:flex;align-items:center;justify-content:center}
.fm-search-clear:hover{background:var(--fm-accent-hover);color:var(--fm-icon-hover)}
.fm-search-input input{padding-right:22px}
.fm-toolbar{display:flex;align-items:center;justify-content:space-between;gap:8px;padding:5px 10px;border-bottom:1px solid var(--fm-border)}
.fm-toolbar-count{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:11px;color:var(--fm-text-sec)}
.fm-sort-select{flex:none;background:var(--fm-input-bg);border:1px solid var(--fm-accent);border-radius:6px;color:var(--fm-text);font-size:11px;padding:2px 5px;outline:none;cursor:pointer}
.fm-sort-select:focus{border-color:var(--fm-accent-strong)}
.fm-node-mtime{flex:none;color:var(--fm-text-mut);font-size:10.5px;margin-left:6px}
.fm-icon-btn.fm-active{color:var(--fm-brand);background:var(--fm-accent-hover)}
.fm-toolbar .fm-icon-btn{width:22px;height:22px;font-size:12px}
.fm-breadcrumb{display:flex;flex-wrap:wrap;align-items:center;gap:2px;padding:4px 10px;border-bottom:1px solid var(--fm-border);font-size:11px}
.fm-crumb{color:var(--fm-text-sec);cursor:pointer;padding:1px 3px;border-radius:4px;max-width:160px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.fm-crumb:hover,.fm-crumb.last{color:var(--fm-text);background:var(--fm-row-hover)}
.fm-crumb-sep{opacity:.5;margin:0 2px}
.fm-batchbar{display:flex;align-items:center;gap:6px;padding:5px 10px;border-bottom:1px solid var(--fm-border);background:var(--fm-row-selected);font-size:12px}
.fm-batchcount{flex:none;color:var(--fm-brand);font-weight:600}
.fm-batchbar .danger{color:#e05b5b}
.fm-batchbar .danger:hover{background:rgba(224,91,91,.16)}
.fm-tree{flex:1;overflow:auto;padding:4px 0}
.fm-row{display:flex;align-items:center;gap:5px;padding:3px 8px;cursor:pointer;white-space:nowrap;border-radius:5px;margin:1px 4px;position:relative}
.fm-row:hover{background:var(--fm-row-hover)}
.fm-row-selected{background:var(--fm-row-selected)}
.fm-row-checked{background:linear-gradient(90deg,var(--fm-accent-hover),rgba(255,255,255,.04))}
.fm-check{flex:none;width:14px;height:14px;margin-right:2px;display:inline-flex;align-items:center;justify-content:center;border:1.5px solid var(--fm-accent);border-radius:4px;cursor:pointer;color:var(--fm-brand);background:var(--fm-input-bg);transition:all .12s ease;flex-shrink:0}
.fm-check:hover{border-color:var(--fm-brand);box-shadow:0 0 0 3px var(--fm-accent-hover)}
.fm-check.on{background:var(--fm-accent-hover);border-color:var(--fm-brand);color:#fff}
.fm-chevron{width:14px;height:14px;display:inline-flex;align-items:center;justify-content:center;flex:none;color:var(--fm-text-sec)}
.fm-chevron-none{visibility:hidden}
.fm-node-icon{flex:none;display:inline-flex;align-items:center}
.fm-node-dir{color:#e0a03c}
.fm-node-name{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis}
.fm-node-size{flex:none;color:var(--fm-text-mut);font-size:11px;margin-left:6px}
.fm-node-loading{flex:none;color:var(--fm-text-mut)}
.fm-node-error{padding:2px 14px;color:#e05b5b;font-size:11px}
.fm-empty{padding:20px;text-align:center;color:var(--fm-text-mut)}
.fm-context-bg{position:fixed;inset:0;z-index:200;background:transparent}
.fm-context{position:fixed;z-index:210;min-width:190px;max-width:280px;background:var(--fm-bg-context);-webkit-backdrop-filter:blur(16px) saturate(1.3);backdrop-filter:blur(16px) saturate(1.3);border:1px solid var(--fm-accent);border-radius:10px;box-shadow:0 10px 34px -8px var(--fm-glow),inset 0 0 0 1px rgba(255,255,255,.04);padding:4px;color:var(--fm-text);font-size:12.5px}
.fm-ctx-item{display:flex;align-items:center;gap:8px;padding:6px 8px;border-radius:5px;cursor:pointer;user-select:none}
.fm-ctx-item:hover{background:var(--fm-code-bg)}
.fm-ctx-item.disabled{opacity:.45;pointer-events:none}
.fm-ctx-item.danger{color:#e05b5b}
.fm-ctx-item.danger:hover{background:rgba(224,91,91,.14)}
.fm-ctx-item .ic{flex:none;width:16px;display:inline-flex;justify-content:center}
.fm-ctx-sep{height:1px;background:var(--fm-border);margin:4px 6px}
.fm-ctx-label{padding:3px 8px;color:var(--fm-text-mut);font-size:10.5px;text-transform:uppercase;letter-spacing:.4px}
.fm-tok-keyword{color:#569cd6}.fm-tok-string{color:#ce9178}.fm-tok-comm{color:#6a9955}.fm-tok-num{color:#b5cea8}
.fm-reader{position:fixed;top:0;left:0;right:0;bottom:0;z-index:600;display:flex;flex-direction:column;background:var(--fm-bg-reader);-webkit-backdrop-filter:blur(20px) saturate(1.3);backdrop-filter:blur(20px) saturate(1.3);color:var(--fm-text);border:none;box-sizing:border-box}
/* When the Files panel is open, keep it visible on the right and start reader content at its left edge. */
html[data-fm-open] .fm-reader{right:var(--fm-panel-width);border-right:1px solid var(--fm-border);
  -webkit-backdrop-filter:blur(12px) saturate(1.2);backdrop-filter:blur(12px) saturate(1.2)}
.fm-reader *{box-sizing:border-box}
.fm-reader-bar{display:flex;align-items:center;gap:8px;padding:8px 14px;border-bottom:1px solid var(--fm-border);font-size:13px;flex:none}
.fm-reader-name{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-weight:600}
.fm-reader-path{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-family:var(--dsw-alias-font-mono,ui-monospace,Menlo,Consolas,monospace);font-size:11px;color:var(--fm-text-sec);margin-left:8px;display:none}
.fm-reader-actions{flex:none;display:flex;gap:4px;align-items:center}
.fm-reader-nav{flex:none;display:flex;gap:3px;align-items:center;margin-right:2px}
.fm-reader-nav .fm-icon-btn{width:22px;height:22px}
.fm-reader-idx{flex:none;font-size:11px;color:var(--fm-text-mut);margin-left:2px}
.fm-icon-btn.fm-disabled{opacity:.32;pointer-events:none}
.fm-reader-body{flex:1;overflow:auto;padding:22px 30px;font-family:var(--dsw-alias-font-mono,ui-monospace,Menlo,Consolas,monospace);font-size:13px;line-height:1.7;white-space:pre-wrap;word-break:break-word;color:var(--fm-text);max-width:1100px;margin:0 auto;width:100%}
.fm-reader-body.md{font-family:var(--dsw-alias-font-sans,inherit);white-space:normal}
.fm-reader-frame{flex:1;min-height:0;border:none;width:100%;background:transparent}
.fm-reader-media{flex:1;min-height:0;overflow:auto;display:flex;align-items:center;justify-content:center;padding:16px;box-sizing:border-box}
.fm-reader-img{max-width:100%;max-height:100%;object-fit:contain;border-radius:6px}
.fm-reader-video{max-width:100%;max-height:100%}
.fm-reader-audio{width:min(640px,90%)}
.fm-reader-body.md h1,.fm-reader-body.md h2,.fm-reader-body.md h3{margin:.7em 0 .35em;line-height:1.3}
.fm-reader-body.md code{background:var(--fm-code-bg);padding:1px 4px;border-radius:4px;font-family:var(--dsw-alias-font-mono,ui-monospace,Menlo,Consolas,monospace);font-size:.92em}
.fm-reader-body.md pre{background:var(--fm-code-bg);padding:12px;border-radius:8px;overflow:auto;white-space:pre}
.fm-reader-body.md pre code{background:none;padding:0}
.fm-reader-body.md blockquote{border-left:3px solid var(--fm-brand);margin:.5em 0;padding-left:12px;color:var(--fm-text-sec)}
.fm-reader-body.md table{border-collapse:collapse;margin:.5em 0;display:block;overflow:auto}
.fm-reader-body.md th,.fm-reader-body.md td{border:1px solid var(--fm-border);padding:5px 9px}
.fm-reader-body.md th{background:var(--fm-code-bg)}
.fm-reader-body.md a{color:var(--fm-brand)}
.fm-reader-body.md img{max-width:100%}
.fm-reader-body.md hr{border:none;border-top:1px solid var(--fm-border);margin:10px 0}
.fm-reader-body.md ul,.fm-reader-body.md ol{padding-left:1.5em;margin:.3em 0}
.fm-edit-area{flex:1;min-height:0;border:none;outline:none;resize:none;padding:22px 30px;font-family:var(--dsw-alias-font-mono,ui-monospace,Menlo,Consolas,monospace);font-size:13px;line-height:1.7;background:transparent;color:var(--fm-text);white-space:pre;width:100%;max-width:1100px;margin:0 auto}
.fm-reader-message{padding:40px;text-align:center;color:var(--fm-text-mut);font-size:13px}
.fm-toast{position:fixed;right:16px;bottom:16px;z-index:800;background:var(--fm-bg-toast);-webkit-backdrop-filter:blur(14px);backdrop-filter:blur(14px);border:1px solid var(--fm-accent);border-radius:10px;box-shadow:0 8px 28px -6px var(--fm-glow);padding:8px 14px;font-size:12.5px;color:var(--fm-text);max-width:70vw}
.fm-toast.error{border-color:#e05b5b;color:#e05b5b}
.fm-toggle{border:none;background:transparent;cursor:pointer;color:var(--fm-text-sec);padding:4px 8px;border-radius:6px;display:inline-flex;align-items:center;gap:5px;white-space:nowrap}
.fm-toggle-label{font-size:12px;font-weight:500}
.fm-toggle:hover,.fm-toggle-on{color:var(--fm-brand);background:var(--fm-code-bg)}
.fm-overlay-fallback{position:fixed;right:14px;bottom:14px;z-index:800;width:34px;height:34px;background:linear-gradient(160deg,#2a2350,#120e28 80%);border:1px solid var(--fm-accent);border-radius:10px;box-shadow:0 6px 20px -4px var(--fm-glow);cursor:pointer;display:flex;align-items:center;justify-content:center;font-size:15px}
.fm-overlay-fallback:hover{background:linear-gradient(160deg,#3a2f6e,#1a1540 80%)}
html[data-fm-open] .fm-overlay-fallback{display:none}
.fm-theme-btn{display:flex;align-items:center;justify-content:center;width:26px;height:26px;padding:0;border:none;border-radius:50%;background:var(--fm-code-bg);cursor:pointer;flex:none;box-shadow:inset 0 0 0 1px var(--fm-accent)}
.fm-theme-btn:hover{transform:scale(1.08);box-shadow:inset 0 0 0 2px var(--fm-accent-strong)}
.fm-theme-picker{position:fixed;z-index:230;width:232px;background:var(--fm-bg-context);-webkit-backdrop-filter:blur(18px);backdrop-filter:blur(18px);border:1px solid var(--fm-accent);border-radius:12px;box-shadow:0 12px 36px -10px var(--fm-glow),inset 0 0 0 1px rgba(255,255,255,.04);padding:8px;font-size:12px}
.fm-theme-title{font-size:10.5px;text-transform:uppercase;letter-spacing:.5px;color:var(--fm-text-mut);padding:2px 4px 6px}
.fm-theme-group{margin-bottom:8px}
.fm-theme-group:last-child{margin-bottom:0}
.fm-theme-group-label{font-size:9.5px;text-transform:uppercase;letter-spacing:.6px;color:var(--fm-text-mut);padding:0 4px 4px}
.fm-theme-grid{display:grid;grid-template-columns:repeat(5,1fr);gap:7px}
.fm-theme-swatch{display:flex;flex-direction:column;align-items:center;gap:3px;padding:4px 0;border:none;background:transparent;cursor:pointer;border-radius:8px}
.fm-theme-swatch:hover{background:rgba(255,255,255,.06)}
.fm-theme-dot{width:100%;height:26px;border-radius:7px;border:1px solid rgba(255,255,255,.14);box-shadow:0 2px 6px rgba(0,0,0,.35)}
.fm-theme-swatch.active .fm-theme-dot{outline:2px solid var(--fm-accent-strong);outline-offset:1px}
.fm-theme-name{font-size:9px;color:var(--fm-text-sec);white-space:nowrap}
.fm-theme-bg{position:fixed;inset:0;z-index:225;background:transparent}
`;

    function injectCss() {
      // DSH convention: `data-plugin` marks ownership for the loader's unload cleanup,
      // while `data-plugin-css` carries a per-contribution id for idempotent re-injection.
      if (document.querySelector('style[data-plugin-css="dsh-file-manager/css"]')) return;
      var tag = document.createElement('style');
      tag.dataset.plugin = 'dsh-file-manager';
      tag.dataset.pluginCss = 'dsh-file-manager/css';
      tag.textContent = CSS;
      document.head.appendChild(tag);
    }

    // ========================= API client =========================
    var BASE = '/plugins/file-manager';
    function get(n, p) { var q = p ? new URLSearchParams(p).toString() : ''; return fetch(BASE + '/' + n + (q ? '?' + q : '')).then(function (r) { return r.json(); }); }
    function post(n, b) { return fetch(BASE + '/' + n, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(b || {}) }).then(function (r) { return r.json(); }); }
    var api = {
      list: function (p) { return get('list', { path: p }); },
      search: function (r, q) { return get('search', { root: r, q: q }); },
      read: function (p) { return get('read', { path: p }); },
      write: function (p, c) { return post('write', { path: p, content: c }); },
      rename: function (p, np) { return post('rename', { path: p, newPath: np }); },
      del: function (p) { return post('delete', { path: p }); },
      mkdir: function (p) { return post('mkdir', { path: p }); },
      touch: function (p) { return post('touch', { path: p }); },
      open: function (p) { return post('open', { path: p }); },
      reveal: function (p) { return post('reveal', { path: p }); },
      openVscode: function (p) { return post('open-vscode', { path: p }); },
    };

    // ========================= store =========================
    var store = {
      open: false,
      width: 340,
      dragging: false,
      rootPath: null,
      rootName: '',
      searchRoot: null, // workspace root that search always scans, independent of the viewed subdir
      sortBy: 'name',
      showDot: false,
      multi: false, // multi-select mode on
      sel: new Set(), // selected paths (when multi)
      navStack: [], // paths for back navigation
      dragSel: false, // mouse-drag multi-select in progress
      rubber: null, // {x1,y1,x2,y2} selection band geometry
      tree: null,
      query: '',
      matches: null,
      searching: false,
      searchError: null,
      preview: null,
      menu: null,
      toast: null,
      booted: false,
      theme: 'indigo',
      themeOpen: false,
    };
    var listeners = new Set();
    var toastTimer = null;
    function emit() { listeners.forEach(function (l) { l(); }); }
    function subscribe(l) { listeners.add(l); return function () { listeners.delete(l); }; }
    function useStore() {
      var s = react.useState(0); var setTick = s[1];
      react.useEffect(function () { return subscribe(function () { setTick(function (x) { return x + 1; }); }); }, []);
      return store;
    }
    function setOpen(v) {
      store.open = v;
      if (v) {
        document.documentElement.setAttribute('data-fm-open', '');
        document.documentElement.style.setProperty('--fm-panel-width', store.width + 'px');
      } else {
        document.documentElement.removeAttribute('data-fm-open');
      }
      emit();
    }
    function startResize(e) {
      store.dragging = true;
      try { window.getSelection().removeAllRanges(); } catch (err) {}
      emit();
      var startX = e.clientX || 0;
      var startW = store.width;
      var onMove = function (ev) {
        var w = startW - (ev.clientX - startX);
        w = Math.max(200, Math.min(w, window.innerWidth - 100));
        store.width = w;
        document.documentElement.style.setProperty('--fm-panel-width', w + 'px');
        emit();
      };
      var onUp = function () {
        store.dragging = false;
        document.removeEventListener('mousemove', onMove);
        document.removeEventListener('mouseup', onUp);
        emit();
      };
      document.addEventListener('mousemove', onMove);
      document.addEventListener('mouseup', onUp);
    }
    function showToast(text, error) {
      store.toast = { text: text, error: !!error };
      if (toastTimer) clearTimeout(toastTimer);
      toastTimer = setTimeout(function () { store.toast = null; emit(); }, 2600);
      emit();
    }

    // ========================= icons =========================
    var iconPaths = {
      chevronRight: 'M6 4l6 6-6 6',
      chevronLeft: 'M18 4l-6 6 6 6M6 4h12',
      chevronDown: 'M4 6l6 6 6-6',
      chevronUp: 'M4 18l6-6 6 6',
      folder: 'M3 5h6l2 2h10a1 1 0 011 1v9a2 2 0 01-2 2H4a2 2 0 01-2-2V6a1 1 0 011-1z',
      folderOpen: 'M3 6a1 1 0 011-1h5l2 2h8a1 1 0 011 1v1H7.5a1.5 1.5 0 00-1.42 1L5 14.5 6.1 6.1zM3 12l1.8-5.4a1 1 0 01.95-.66H20a1 1 0 011 1.06L19.55 14.5A2 2 0 0117.6 16H5.4A2 2 0 013.6 14.3zM4 14h13v6H4z',
      file: 'M7 3h7l5 5v11a2 2 0 01-2 2H7a2 2 0 01-2-2V5a2 2 0 012-2z',
      files: 'M8 7a2 2 0 00-2 2v9a2 2 0 002 2h8a2 2 0 002-2V9a2 2 0 00-2-2H8zm6-4H6a2 2 0 00-2 2v11h2V6h8V3z',
      search: 'M11 4a7 7 0 110 14 7 7 0 010-14zm0 2a5 5 0 100 10 5 5 0 000-10zm4.5 9.5l3 3',
      close: 'M6 6l12 12M18 6L6 18',
      copy: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h8a2 2 0 002-2v-1M15 3h3v3m0 0l-8 8M18 6l-8 8',
      edit: 'M4 20h4L19.5 8.5a2.1 2.1 0 00-3-3L5 17v3z',
      trash: 'M6 7h12M9 7V5a1 1 0 011-1h4a1 1 0 011 1v2m-8 0l1 13h8l1-13M10 11v4M14 11v4',
      folderPlus: 'M3 6a1 1 0 011-1h5l2 2h9a1 1 0 011 1v10a1 1 0 01-1 1H4a1 1 0 01-1-1V6zm9 4v5m-2.5-2.5h5',
      filePlus: 'M14 3H6a2 2 0 00-2 2v14a2 2 0 002 2h12a2 2 0 002-2V7l-6-6zm0 0h5v5M12 12v5m-2.5-2.5h5',
      refresh: 'M4 12a8 8 0 018-8 8 8 0 015 3m0 0V3m0 4h-4M20 12a8 8 0 01-8 8 8 8 0 01-5-3m0 0v4m0-4h4',
      code: 'M8 9l-4 3 4 3M16 9l4 3-4 3M14 5l-4 14',
      open: 'M11 5H5a2 2 0 00-2 2v12a2 2 0 002 2h12a2 2 0 002-2v-6M19 3h-5m5 0l-8 8m8-8v5',
      reveal: 'M8 21H6a2 2 0 01-2-2V5a2 2 0 012-2h4m6 14h2a2 2 0 002-2v-3M13 3h5v5M13 8l6-6',
      check: 'M5 13l4 4L19 7',
      download: 'M12 3v12m0 0l-4-4m4 4l4-4M4 21h16',
      eye: 'M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6-10-6-10-6zm10 3a3 3 0 100-6 3 3 0 000 6z',
      add: 'M12 5v14m-7-7h14',
    };
    function Icon(props) {
      return react.createElement('svg', {
        width: props.size || 14, height: props.size || 14, viewBox: '0 0 24 24',
        fill: 'none', stroke: 'currentColor', 'stroke-width': 1.7,
        'stroke-linecap': 'round', 'stroke-linejoin': 'round',
      }, iconPaths[props.name] ? react.createElement('path', { d: iconPaths[props.name] }) : null);
    }

    // ---- File-type icons: each extension family gets a themed color + badge ----
    var FILE_COLORS = {
      code: '#4fb7e0', md: '#5aa7f0', json: '#d6c35a', image: '#7ab73d', pdf: '#e0656b',
      archive: '#c9a05c', doc: '#5aa7f0', sheet: '#5fbf6d', slide: '#e08a4f', video: '#d065e0',
      audio: '#55c7b0', font: '#8f9bd6', data: '#e0734f', config: '#a0a8b5', text: '#a8b1c0',
      sql: '#8a7ff0', script: '#4fd08f', exe: '#e0d24f', lock: '#e08a8a', other: '#9aa3b3',
    };
    function fileTypeKey(name) {
      var n = String(name || '').toLowerCase();
      var dot = n.lastIndexOf('.');
      var ext = dot >= 0 ? n.slice(dot + 1) : '';
      if (!ext) return 'other';
      var e = ext;
      // dotfiles (config): .gitignore, .env, .npmrc, .eslintrc ...
      if (e === 'gitignore' || e === 'npmignore' || e === 'editorconfig' || e === 'eslintrc' || e === 'prettierrc' || e === 'env' || e === 'npmrc' || e === 'gitattributes') return 'config';
      // code & markdown
      if (['ts','tsx','js','jsx','mjs','cjs','mts','cts','css','scss','less','html','htm','xml','vue','svelte','astro','c','h','cpp','hpp','cc','cxx','java','rs','go','py','rb','php','swift','kt','cs','lua','sh','bash','zsh','pl','r','scala','dart','zig','clj','hs','sql','sqlite','db'].indexOf(e) >= 0) return 'code';
      if (['md','markdown','mdown','mkd','rst'].indexOf(e) >= 0) return 'md';
      if (['json','jsonc','jsonl','yaml','yml','toml','ini','cfg','conf'].indexOf(e) >= 0) return 'json';
      if (['png','jpg','jpeg','gif','svg','webp','bmp','ico','avif'].indexOf(e) >= 0) return 'image';
      if (['pdf'].indexOf(e) >= 0) return 'pdf';
      if (['zip','tar','gz','7z','rar','bz2','xz','tgz'].indexOf(e) >= 0) return 'archive';
      if (['doc','docx','odt','rtf'].indexOf(e) >= 0) return 'doc';
      if (['xls','xlsx','ods'].indexOf(e) >= 0) return 'sheet';
      if (['csv'].indexOf(e) >= 0) return 'sheet';
      if (['ppt','pptx','odp','key'].indexOf(e) >= 0) return 'slide';
      if (['mp4','mkv','mov','avi','webm','mpg','mpeg','flv','wmv','m4v'].indexOf(e) >= 0) return 'video';
      if (['mp3','wav','flac','aac','ogg','m4a','wma','opus'].indexOf(e) >= 0) return 'audio';
      if (['ttf','otf','woff','woff2','eot'].indexOf(e) >= 0) return 'font';
      if (['exe','app','msi','deb','rpm','dmg','bat','cmd','apk','ipa'].indexOf(e) >= 0) return 'exe';
      if (['log','txt'].indexOf(e) >= 0) return 'text';
      return 'other';
    }
    var FILE_BADGE = {
      code: 'JS', md: 'M↓', json: '{}', image: '▣', pdf: 'PDF', archive: '▤', doc: 'W',
      sheet: 'X', slide: 'P', video: '▶', audio: '♪', font: 'Aa', data: 'DB', config: '⚙',
      sql: 'DB', script: '>_', exe: '▶', text: 'TXT', other: '',
    };
    // Convert a path/name to a short badge label.
    function fileBadge(name) {
      var t = fileTypeKey(name);
      return FILE_BADGE[t] || '';
    }
    function FileIcon(props) {
      var size = props.size || 14;
      var type = fileTypeKey(props.name);
      var color = FILE_COLORS[type] || FILE_COLORS.other;
      var badge = FILE_BADGE[type];
      var children = [];
      // Document body (rounded rect, filled tint)
      children.push(react.createElement('rect', { key: 'b', x: 5, y: 3, width: 14, height: 18, rx: 2.5, ry: 2.5, fill: color, opacity: 0.22 }));
      children.push(react.createElement('rect', { key: 'r', x: 5, y: 3, width: 14, height: 18, rx: 2.5, ry: 2.5, fill: 'none', stroke: color, 'stroke-width': 1.2 }));
      // Filled corner fold
      children.push(react.createElement('path', { key: 'f', d: 'M14 3v5h5', fill: 'none', stroke: color, 'stroke-width': 1.4 }));
      if (badge) {
        children.push(react.createElement('text', {
          key: 't', x: 12, y: 15, 'text-anchor': 'middle', 'font-size': 3.4, 'font-family': 'ui-monospace,Menlo,Consolas,monospace',
          fill: color, 'font-weight': 700,
        }, badge.length > 3 ? badge.slice(0, 3) : badge));
      } else {
        children.push(react.createElement('line', { key: 'l1', x1: 8, y1: 10, x2: 16, y2: 10, stroke: color, 'stroke-width': 1.2, 'stroke-linecap': 'round' }));
        children.push(react.createElement('line', { key: 'l2', x1: 8, y1: 13, x2: 16, y2: 13, stroke: color, 'stroke-width': 1.2, 'stroke-linecap': 'round' }));
        children.push(react.createElement('line', { key: 'l3', x1: 8, y1: 16, x2: 15, y2: 16, stroke: color, 'stroke-width': 1.2, 'stroke-linecap': 'round' }));
      }
      return react.createElement('svg', { width: size, height: size, viewBox: '0 0 24 24', fill: 'none' }, ...children);
    }

    function fmtSize(n) {
      if (n === null || n === undefined) return '';
      if (n < 1024) return n + ' B';
      if (n < 1048576) return (n / 1024).toFixed(1) + ' KB';
      if (n < 1073741824) return (n / 1048576).toFixed(1) + ' MB';
      return (n / 1073741824).toFixed(1) + ' GB';
    }
    function fmtDate(ms) {
      if (!ms) return '';
      try {
        var d = new Date(ms);
        var p = function (x) { return (x < 10 ? '0' : '') + x; };
        return p(d.getDate()) + '/' + p(d.getMonth() + 1) + '/' + d.getFullYear();
      } catch (e) { return ''; }
    }
    function sortEntries(list, by) {
      var a = (list || []).slice();
      function v(x) { return x.childrenCount != null ? x.childrenCount : (x.size != null ? x.size : -1); }
      a.sort(function (x, y) {
        if (x.type !== y.type) return x.type === 'directory' ? -1 : 1;
        var dx = x.type === 'directory' ? 1 : 0;
        if (by === 'size') {
          var sa = x.size != null ? x.size : -1;
          var sb = y.size != null ? y.size : -1;
          return sb - sa;
        } else if (by === 'mtime') {
          var ma = x.mtime || 0;
          var mb = y.mtime || 0;
          return mb - ma;
        } else if (by === 'type') {
          return fileTypeKey(x.name).localeCompare(fileTypeKey(y.name));
        }
        return x.name.localeCompare(y.name);
      });
      return a;
    }

    // ========================= path helpers =========================
    function joinPath(dir, name) { return dir.endsWith('/') ? dir + name : dir + '/' + name; }
    function dirnameOf(p) { var t = p.replace(/\/+$/, ''); var i = t.lastIndexOf('/'); return i <= 0 ? '/' : t.slice(0, i); }
    function basenameOf(p) { var t = p.replace(/\/+$/, ''); return t.slice(t.lastIndexOf('/') + 1); }

    // ========================= tree =========================
    function loadDir(path) {
      return api.list(path).then(function (res) {
        if (res && !res.error) return res.entries || [];
        return null;
      });
    }
    function initTree(rootPath, rootName) {
      store.rootPath = rootPath;
      store.rootName = rootName;
      store.tree = { rootPath: rootPath, expanded: new Set([rootPath]), cache: new Map(), loading: new Set([rootPath]), selected: null, errors: {} };
      emit();
      loadDir(rootPath).then(function (children) {
        if (!store.tree || store.tree.rootPath !== rootPath) return;
        store.tree.cache.set(rootPath, children || []);
        store.tree.loading.delete(rootPath);
        store.tree.errors[rootPath] = children ? undefined : 'unable to list';
        emit();
      });
    }
    function toggleDir(path) {
      var t = store.tree;
      if (!t) return;
      if (t.expanded.has(path)) {
        var s0 = new Set(t.expanded); s0.delete(path);
        store.tree = Object.assign({}, t, { expanded: s0 });
        emit(); return;
      }
      var s1 = new Set(t.expanded); s1.add(path);
      store.tree = Object.assign({}, t, { expanded: s1, loading: new Set(t.loading).add(path) });
      emit();
      loadDir(path).then(function (children) {
        var cur = store.tree; if (!cur || !cur.cache) return;
        var cache = new Map(cur.cache); var errors = Object.assign({}, cur.errors);
        var loading = new Set(cur.loading); loading.delete(path);
        if (!children) errors[path] = 'unable to list';
        else { cache.set(path, children); delete errors[path]; }
        store.tree = Object.assign({}, cur, { cache: cache, errors: errors, loading: loading });
        emit();
      });
    }
    function refreshAll() {
      var t = store.tree; if (!t) return;
      var dirs = Array.from(t.expanded);
      store.tree = Object.assign({}, t, { loading: new Set([t.rootPath]), cache: new Map(), errors: {} });
      emit();
      dirs.forEach(function (dir) {
        loadDir(dir).then(function (children) {
          var cur = store.tree; if (!cur || !cur.cache) return;
          var cache = new Map(cur.cache); var loading = new Set(cur.loading); loading.delete(dir);
          if (children) cache.set(dir, children);
          store.tree = Object.assign({}, cur, { cache: cache, loading: loading });
          emit();
        });
      });
    }

    // ========================= navigation =========================
    // Navigate INTO a subdirectory (re-roots the tree view, keeps a back stack).
    function enterDir(entry) {
      store.navStack = store.navStack.concat([store.rootPath]);
      initTree(entry.path, entry.name);
      toggleMulti(false);
      emit();
    }
    function goBackDir() {
      var st = store.navStack;
      if (!st.length) return;
      var prev = st[st.length - 1];
      store.navStack = st.slice(0, -1);
      initTree(prev, basenameOf(prev) || store.rootName);
      toggleMulti(false);
      emit();
    }
    function goToRoot() {
      // Go to first segment if we're deep, else stay.
      var st = store.navStack;
      if (st.length > 0) {
        var root0 = st[0];
        store.navStack = [];
        initTree(root0, basenameOf(root0) || store.rootName);
      }
      toggleMulti(false);
      emit();
    }
    // Breadcrumb parts: split current path into segments for clickable nav.
    function crunch(path) {
      var parts = String(path || '').split('/').filter(function (s) { return !!s; });
      var segs = [];
      var cur = '';
      parts.forEach(function (seg) {
        cur = cur ? cur + '/' + seg : '/' + seg;
        segs.push({ name: seg, full: cur });
      });
      return segs;
    }
    function goToSegment(path) {
      if (!path || path === store.rootPath) return;
      store.navStack = store.navStack.concat([store.rootPath]);
      initTree(path, basenameOf(path) || store.rootName);
      toggleMulti(false);
      emit();
    }

    // ========================= multi-select =========================
    function toggleMulti(v) {
      store.multi = !!v;
      if (!store.multi) store.sel = new Set();
      emit();
    }
    function toggleSel(path) {
      var s = new Set(store.sel);
      if (s.has(path)) s.delete(path); else s.add(path);
      store.sel = s;
      emit();
    }
    var dragState = null; // {sx, sy, active:bool}
    var clickSkips = false; // suppress onClick when a real drag just happened
    function startTreeDrag(e) {
      if (!store.open) { return; }
      // Ignore drags that begin on interactive controls (buttons/input/iframes render).
      if (e.target && e.target.closest && (e.target.closest('.fm-icon-btn') || e.target.closest('.fm-sort-select') || e.target.closest('input, select, button'))) return;
      dragState = { sx: e.clientX, sy: e.clientY, active: false };
      try { e.preventDefault(); } catch (err) {}
    }
    function bandRect() {
      if (!dragState) return null;
      var x1 = Math.min(dragState.sx, lastMove.x), x2 = Math.max(dragState.sx, lastMove.x);
      var y1 = Math.min(dragState.sy, lastMove.y), y2 = Math.max(dragState.sy, lastMove.y);
      return { x1: x1, y1: y1, x2: x2, y2: y2 };
    }
    var lastMove = { x: 0, y: 0 };
    function onTreeDragMove(ev) {
      if (!dragState) return;
      lastMove.x = ev.clientX; lastMove.y = ev.clientY;
      var d = dragState;
      // Engage only once the pointer actually moves beyond a threshold.
      if (!d.active) {
        if (Math.abs(ev.clientX - d.sx) < 4 && Math.abs(ev.clientY - d.sy) < 4) return;
        d.active = true;
        clickSkips = true;
        if (!store.multi) toggleMulti(true);
        store.sel = new Set();
        store.dragSel = true;
      }
      // The drag rectangle that the pointer swept over, in viewport coords.
      var r = bandRect();
      store.rubber = r;
      // Reselect every row that the band overlaps.
      var sel = new Set();
      var rows = document.querySelectorAll('.fm-panel .fm-row');
      for (var i = 0; i < rows.length; i++) {
        var rect = rows[i].getBoundingClientRect();
        var path = rows[i].getAttribute('data-path');
        if (!path) continue;
        // Row overlaps the vertical band (treat as "enclosed by the drag rectangle").
        if (rect.bottom >= r.y1 && rect.top <= r.y2 && rect.right >= r.x1 && rect.left <= r.x2) sel.add(path);
      }
      store.sel = sel;
      emit();
    }
    function onTreeDragEnd() {
      if (!dragState) return;
      store.dragSel = false;
      store.rubber = null;
      dragState = null;
      emit();
    }
    function selectedList() {
      return Array.from(store.sel);
    }

    // ========================= download =========================
    function downloadPath(path) {
      var a = document.createElement('a');
      a.href = BASE + '/download?path=' + encodeURIComponent(path);
      a.download = '';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      showToast('Downloading…');
    }

    // ========================= search =========================
    var searchTimer = null;
    function doSearch(q) {
      store.searching = true; store.searchError = null; emit();
      api.search(store.searchRoot || store.rootPath || '', q).then(function (res) {
        if (store.query !== q) return;
        store.searching = false;
        store.matches = (res && !res.error) ? (res.matches || []) : null;
        store.searchError = res && res.error ? res.error : (res && res.truncated ? 'Results truncated' : null);
        emit();
      }).catch(function (err) {
        if (store.query !== q) return;
        store.searching = false; store.matches = null;
        store.searchError = String((err && err.message) || err); emit();
      });
    }
    function runSearch(q) {
      if (searchTimer !== null) clearTimeout(searchTimer);
      if (q === '') { store.matches = null; store.searching = false; store.searchError = null; emit(); return; }
      searchTimer = setTimeout(function () { searchTimer = null; doSearch(q); }, 300);
    }
    function setQuery(v) { store.query = String(v || ''); emit(); runSearch(store.query); }
    function setSort(v) { store.sortBy = String(v || 'name'); try { localStorage.setItem('fm-sort', store.sortBy); } catch (e) {} emit(); }
    function initSort() { try { var s = localStorage.getItem('fm-sort'); if (s) store.sortBy = s; } catch (e) {} }

    // ========================= context menu =========================
    function openContext(e, entry) {
      e.preventDefault(); e.stopPropagation();
      store.menu = { x: e.clientX, y: e.clientY, path: entry.path, name: entry.name, isDir: entry.type === 'directory' };
      emit();
    }
    // Right-click on empty/root area of the panel: menu for the workspace root.
    function openRootContext(e) {
      e.preventDefault(); e.stopPropagation();
      var root = store.rootPath;
      if (!root) return;
      store.menu = { x: e.clientX, y: e.clientY, path: root, name: store.rootName || 'Workspace root', isDir: true, isRoot: true };
      emit();
    }
    function closeContext() { store.menu = null; emit(); }

    function copyPath(path) {
      function legacy() {
        var ta = document.createElement('textarea');
        ta.value = path; document.body.appendChild(ta); ta.select();
        try { document.execCommand('copy'); } catch (e) {}
        document.body.removeChild(ta);
      }
      var pr;
      if (navigator.clipboard && navigator.clipboard.writeText) {
        pr = navigator.clipboard.writeText(path).then(function () { showToast('Copied'); }).catch(function () { legacy(); showToast('Copied'); });
      } else { legacy(); pr = Promise.resolve(); }
      closeContext();
      pr.catch(function () {});
    }
    function batchDelete() {
      var paths = selectedList();
      if (!paths.length) return;
      if (!window.confirm('Delete ' + paths.length + ' item(s)?')) return;
      var done = 0, failed = 0;
      paths.forEach(function (p) {
        api.del(p).then(function (res) {
          if (res && !res.error) done++; else failed++;
          if (done + failed === paths.length) {
            showToast(failed ? 'Deleted ' + done + ', ' + failed + ' failed' : 'Deleted ' + done, !!failed);
            store.sel = new Set(); toggleMulti(false); refreshAll();
          }
        });
      });
    }
    function batchCopy() {
      var paths = selectedList();
      if (!paths.length) return;
      var text = paths.join('\n');
      function legacy() { var ta = document.createElement('textarea'); ta.value = text; document.body.appendChild(ta); ta.select(); try { document.execCommand('copy'); } catch (e) {} document.body.removeChild(ta); }
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(function () { showToast('Copied ' + paths.length + ' paths'); }).catch(function () { legacy(); showToast('Copied ' + paths.length + ' paths'); });
      } else { legacy(); showToast('Copied ' + paths.length + ' paths'); }
    }
    function openPreview(path, name) {
      api.read(path).then(function (res) {
        store.preview = { path: path, name: name, size: res.size, tooLarge: !!res.tooLarge, error: res.error, content: res.content, editing: false };
        emit();
      });
      closeContext();
    }
    function closeReader() { store.preview = null; emit(); }
    function toggleEdit() {
      if (store.preview) { store.preview = Object.assign({}, store.preview, { editing: !store.preview.editing }); emit(); }
    }
    function saveEdit() {
      var area = document.getElementById('fm-edit-area');
      var content = area ? area.value : (store.preview && store.preview.content);
      var p = store.preview; if (!p) return;
      api.write(p.path, content || '').then(function (res) {
        if (res && !res.error) {
          store.preview = Object.assign({}, p, { content: content || '', error: undefined, editing: false });
          showToast('Saved'); refreshAll();
        } else {
          store.preview = Object.assign({}, p, { error: (res && res.error) || 'write failed' });
          showToast((res && res.error) || 'write failed', true);
        }
        emit();
      });
    }
    function promptRename(entry) {
      closeContext();
      var cur = basenameOf(entry.path);
      var next = window.prompt('Rename', cur);
      if (next === null || !next.trim() || next.trim() === cur) return;
      api.rename(entry.path, joinPath(dirnameOf(entry.path), next.trim())).then(function (res) {
        if (res && !res.error) { showToast('Renamed'); refreshAll(); if (store.preview && store.preview.path === entry.path) closeReader(); }
        else { showToast((res && res.error) || 'rename failed', true); refreshAll(); }
      });
    }
    function confirmDelete(entry) {
      closeContext();
      if (store.preview && store.preview.path === entry.path) closeReader();
      if (!window.confirm('Delete "' + entry.name + '"?')) return;
      api.del(entry.path).then(function (res) {
        if (res && !res.error) { showToast('Deleted'); refreshAll(); }
        else { showToast((res && res.error) || 'delete failed', true); refreshAll(); }
      });
    }
    function newFile(dirPath) {
      closeContext();
      var name = window.prompt('New file name');
      if (!name || !name.trim()) return;
      api.touch(joinPath(dirPath || '', name.trim())).then(function (res) {
        if (res && !res.error) { showToast('Created'); refreshAll(); }
        else showToast((res && res.error) || 'create failed', true);
      });
    }
    function newFolder(dirPath) {
      closeContext();
      var name = window.prompt('New folder name');
      if (!name || !name.trim()) return;
      api.mkdir(joinPath(dirPath || '', name.trim())).then(function (res) {
        if (res && !res.error) { showToast('Created'); refreshAll(); }
        else showToast((res && res.error) || 'create failed', true);
      });
    }
    function doOpen(entry) {
      closeContext();
      api.open(entry.path).then(function (res) {
        if (res && res.error) { showToast(res.error, true); return; }
        showToast('Open ' + entry.name);
      });
    }
    function doReveal(entry) {
      closeContext();
      api.reveal(entry.path).then(function (res) {
        if (res && res.error) { showToast(res.error, true); return; }
        showToast('Revealed');
      });
    }
    function doOpenVscode(entry) {
      closeContext();
      api.openVscode(entry.path).then(function (res) {
        if (res && res.error) { showToast(res.error, true); return; }
        if (res && res.ok === false) showToast((res && res.error) || 'VS Code not found', true);
        else showToast('Opening in VS Code');
      });
    }

    // ========================= markdown & highlight =========================
    var isMarkdown = function (name) { return /\.(md|markdown|mdown|mkd)$/i.test(name); };
    var isTextable = function (name) { return /\.(txt|log|json|js|jsx|ts|tsx|css|html|htm|xml|py|rb|go|rs|c|cc|cpp|h|java|sh|bash|sql|yaml|yml|toml|ini|md|mdx|php|swift|kt|dart|vue|svelte|scss|less|graphql|prisma|tf|ya?ml|cfg|conf|properties|env|gitignore)$/i.test(name); };
    function escapeHtml(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
    var tokRules = [
      [/\/\*[\s\S]*?\*\/|\/\/[^\n]*|#[^\n]*/g, 'comm'],
      [/"(?:[^"\\\n]|\\.)*"|'(?:[^'\\\n]|\\.)*'|`(?:[^`\\\n]|\\.)*`/g, 'string'],
      [/\b(?:const|let|var|function|return|if|else|for|while|class|import|export|from|async|await|new|try|catch|throw|switch|case|break|default|typeof|instanceof|in|of|do|void|yield|static|extends|super|this|public|private|protected|interface|type|enum|namespace|declare|readonly|null|undefined|true|false|def|lambda|print|echo|BEGIN|END)\b/g, 'keyword'],
      [/\b\d+(?:\.\d+)?\b/g, 'num'],
    ];
    function highlightLine(text) {
      var html = escapeHtml(text);
      tokRules.forEach(function (rule) {
        var re = new RegExp(rule[0].source, rule[0].flags);
        html = html.replace(re, ' <span class="fm-tok-' + rule[1] + '">$&</span>');
      });
      return html;
    }
    function mdInline(s) {
      var t = escapeHtml(s);
      t = t.replace(/`([^`\n]+)`/g, '<code>$1</code>');
      t = t.replace(/\*\*([^*\s][^*]*?)\*\*/g, '<strong>$1</strong>');
      t = t.replace(/~~([^~\n][^~]*?)~~/g, '<del>$1</del>');
      t = t.replace(/\*([^*\s][^*]*?)\*/g, '<em>$1</em>');
      t = t.replace(/\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/g, '<a href="$1" target="_blank" rel="noreferrer">$2</a>');
      t = t.replace(/!\[([^\]]*)\]\((https?:\/\/[^)\s]+)\)/g, '<img src="$1" alt="$2" />');
      return t;
    }
    function renderMarkdown(content) {
      var lines = String(content).replace(/\r\n/g, '\n').split('\n');
      var out = '';
      var i = 0, inCode = false, codeBuf = [];
      function mk(action) {
        if (inCode) {
          out += '<pre><code>' + highlightLine(codeBuf.join('\n')) + '</code></pre>';
          inCode = false; codeBuf = [];
        }
      }
      while (i < lines.length) {
        var line = lines[i];
        var fence = /^```(\w*)\s*$/.exec(line);
        if (fence) { mk(); if (inCode) { inCode = false; codeBuf = []; } else { inCode = true; codeBuf = []; } i++; continue; }
        if (inCode) { codeBuf.push(line); i++; continue; }
        var h = /^(#{1,6})\s+(.*)$/.exec(line);
        if (h) { out += '<h' + h[1].length + '>' + mdInline(h[2]) + '</h' + h[1].length + '>'; i++; continue; }
        if (line.trim() === '') { mk(); out += '<p><br/></p>'; i++; continue; }
        if (/^---+\s*$/.test(line.trim()) || /^___+\s*$/.test(line.trim())) { out += '<hr/>'; i++; continue; }
        var hr = /^###?\s+(.*)$/.exec(line);
        if (/^[-*+]\s+/.test(line)) {
          var li = line.replace(/^[-*+]\s+/, '');
          out += '<li>' + mdInline(li) + '</li>'; i++; continue;
        }
        if (/^\d+[.)]\s+/.test(line)) {
          out += '<li>' + mdInline(line.replace(/^\d+[.)]\s+/, '')) + '</li>'; i++; continue;
        }
        if (/^\s*>\s?/.test(line)) {
          out += '<blockquote>' + mdInline(line.replace(/^\s*>\s?/, '')) + '</blockquote>'; i++; continue;
        }
        if (/^\s*\|/.test(line)) {
          var rows = [];
          var j = i;
          while (j < lines.length && /^\s*\|/.test(lines[j])) { rows.push(lines[j]); j++; }
          var html = '<table>';
          rows.forEach(function (r) {
            var cells = r.replace(/^\s*\|/, '').replace(/\|\s*$/, '').split('|').map(function (c) { return mdInline(c.trim()); });
            var isSep = cells.length === 1 && /^[\s:|-]+$/.test(cells[0]) && /-/.test(cells[0]);
            if (isSep) return;
            html += '<tr>' + cells.map(function (c) { return '<td>' + c + '</td>'; }).join('') + '</tr>';
          });
          html += '</table>';
          out += html; i = j; continue;
        }
        mk(); out += '<p>' + mdInline(line) + '</p>'; i++;
      }
      mk();
      return out;
    }

    // ========================= themes =========================
    // Per-theme text / border palette so labels never clash with the custom panel.
    var TEXT = {
      indigo: { primary: '#ece8ff', secondary: '#b8b0e8', muted: '#8b84b8', border: 'rgba(206,198,255,.16)', codeBg: 'rgba(12,9,30,.72)', brand: '#a89bff' },
      obsidian: { primary: '#e7ecf3', secondary: '#aeb8c7', muted: '#7c8797', border: 'rgba(200,210,225,.16)', codeBg: 'rgba(12,14,18,.72)', brand: '#8fb3ff' },
      emerald: { primary: '#e4f7ef', secondary: '#a9d9c3', muted: '#79ad94', border: 'rgba(160,231,196,.16)', codeBg: 'rgba(4,18,13,.72)', brand: '#5eead4' },
      ocean: { primary: '#e2f4ff', secondary: '#a8cdf0', muted: '#77a9d2', border: 'rgba(164,213,250,.16)', codeBg: 'rgba(3,17,27,.72)', brand: '#7dd3fc' },
      rose: { primary: '#ffecef', secondary: '#f0b8c2', muted: '#c78b97', border: 'rgba(255,196,206,.16)', codeBg: 'rgba(26,6,12,.72)', brand: '#fda4af' },
      amber: { primary: '#fff4e2', secondary: '#f0cc98', muted: '#c9a469', border: 'rgba(255,213,138,.16)', codeBg: 'rgba(26,15,5,.72)', brand: '#fcd34d' },
      cyberpink: { primary: '#ffe3f6', secondary: '#f0a7da', muted: '#c97ab4', border: 'rgba(255,180,231,.16)', codeBg: 'rgba(26,5,26,.72)', brand: '#f0abfc' },
      midnight: { primary: '#e5f0ff', secondary: '#a9c6ee', muted: '#7c9ad0', border: 'rgba(170,207,255,.16)', codeBg: 'rgba(4,11,26,.72)', brand: '#93c5fd' },
      orange: { primary: '#ffedd9', secondary: '#f2b57d', muted: '#cc925c', border: 'rgba(255,190,130,.16)', codeBg: 'rgba(26,12,5,.72)', brand: '#fdba74' },
      violet: { primary: '#f0e6ff', secondary: '#c8a8ee', muted: '#a37ed0', border: 'rgba(210,178,255,.16)', codeBg: 'rgba(20,6,32,.72)', brand: '#d8b4fe' },
      paper: { primary: '#1e2430', secondary: '#4b5563', muted: '#7b8494', border: 'rgba(60,70,90,.18)', codeBg: 'rgba(240,243,248,.9)', brand: '#4f46e5' },
      mist: { primary: '#1e2b47', secondary: '#40516e', muted: '#71809a', border: 'rgba(45,75,120,.18)', codeBg: 'rgba(237,245,254,.9)', brand: '#2563eb' },
      frost: { primary: '#0f3350', secondary: '#2f5c80', muted: '#6b8ba6', border: 'rgba(25,95,140,.18)', codeBg: 'rgba(234,247,255,.9)', brand: '#0284c7' },
      mint: { primary: '#123c2e', secondary: '#23604a', muted: '#5d8979', border: 'rgba(30,120,90,.18)', codeBg: 'rgba(238,250,245,.9)', brand: '#059669' },
      breeze: { primary: '#0c3c4a', secondary: '#206070', muted: '#54828f', border: 'rgba(25,110,130,.18)', codeBg: 'rgba(235,251,255,.9)', brand: '#0891b2' },
      peach: { primary: '#4c1226', secondary: '#8a3a55', muted: '#b26b84', border: 'rgba(180,70,110,.18)', codeBg: 'rgba(255,243,247,.9)', brand: '#ec4899' },
      sunrise: { primary: '#4d2d12', secondary: '#7a5428', muted: '#a38055', border: 'rgba(170,110,40,.18)', codeBg: 'rgba(255,249,237,.9)', brand: '#d97706' },
      lavender: { primary: '#351a63', secondary: '#5f3d94', muted: '#8a6fae', border: 'rgba(130,90,220,.18)', codeBg: 'rgba(247,242,255,.9)', brand: '#7c3aed' },
      slate: { primary: '#1a2230', secondary: '#3d4a5e', muted: '#6c7a8f', border: 'rgba(55,70,95,.18)', codeBg: 'rgba(241,245,249,.9)', brand: '#475569' },
      bone: { primary: '#201c18', secondary: '#4a443e', muted: '#7a736b', border: 'rgba(80,70,60,.18)', codeBg: 'rgba(248,247,245,.9)', brand: '#57534e' },
    };
    function cssVars(t, ttext) {
      return {
        '--fm-bg': t.panel,
        '--fm-bg-rail': t.rail,
        '--fm-bg-rail-hover': t.railHover,
        '--fm-bg-reader': t.reader,
        '--fm-bg-context': t.context,
        '--fm-bg-toast': t.context,
        '--fm-accent': t.accent,
        '--fm-accent-hover': t.accentHover,
        '--fm-accent-strong': t.accentStrong,
        '--fm-icon': t.icon,
        '--fm-icon-hover': t.iconHover,
        '--fm-row-hover': t.rowHover,
        '--fm-row-selected': t.rowSelected,
        '--fm-input-bg': t.inputBg,
        '--fm-glow': t.glow,
        '--fm-rail-glow': t.railGlow,
        '--fm-top-accent': t.topAccent,
        '--fm-text': ttext.primary,
        '--fm-text-sec': ttext.secondary,
        '--fm-text-mut': ttext.muted,
        '--fm-border': ttext.border,
        '--fm-code-bg': ttext.codeBg,
        '--fm-brand': ttext.brand,
      };
    }
    var THEMES = [
      {
        id: 'indigo', name: 'Indigo', dot: 'linear-gradient(160deg,#5b4bd0,#241e63)',
        panel: 'linear-gradient(178deg,#2a2350 0%,#1c1836 26%,#131026 55%,#0b0918 100%)',
        rail: 'linear-gradient(160deg,#2a2350,#120e28 80%)', railHover: 'linear-gradient(160deg,#3a2f6e,#1a1540 80%)',
        reader: 'linear-gradient(180deg,#241d44 0%,#161233 30%,#0a0816 100%)', context: 'linear-gradient(170deg,#2a2450,#161233 90%)',
        accent: 'rgba(139,124,255,.28)', accentHover: 'rgba(139,124,255,.5)', accentStrong: 'rgba(170,160,255,.6)',
        icon: 'rgba(207,201,255,.75)', iconHover: '#fff', rowHover: 'linear-gradient(90deg,rgba(139,124,255,.14),rgba(139,124,255,.04))', rowSelected: 'linear-gradient(90deg,rgba(139,124,255,.22),rgba(139,124,255,.08))',
        inputBg: 'rgba(10,8,24,.5)', glow: 'rgba(80,60,200,.4)', railGlow: 'rgba(80,60,200,.45)', topAccent: 'rgba(180,170,255,.6)',
      },
      {
        id: 'obsidian', name: 'Obsidian', dot: 'linear-gradient(160deg,#4b5563,#111827)',
        panel: 'linear-gradient(178deg,#26292f 0%,#1a1d22 30%,#121418 60%,#0a0b0d 100%)',
        rail: 'linear-gradient(160deg,#26292f,#101216),rgba(0,0,0,.4)', railHover: 'linear-gradient(160deg,#34383f,#1a1d22)',
        reader: 'linear-gradient(180deg,#23262c 0%,#171a1e 30%,#0a0b0d 100%)', context: 'linear-gradient(170deg,#26292f,#171a1e 90%)',
        accent: 'rgba(148,163,184,.3)', accentHover: 'rgba(148,163,184,.5)', accentStrong: 'rgba(203,213,225,.6)',
        icon: 'rgba(226,232,240,.75)', iconHover: '#fff', rowHover: 'linear-gradient(90deg,rgba(148,163,184,.14),rgba(148,163,184,.04))', rowSelected: 'linear-gradient(90deg,rgba(148,163,184,.24),rgba(148,163,184,.08))',
        inputBg: 'rgba(10,12,16,.5)', glow: 'rgba(50,60,80,.4)', railGlow: 'rgba(50,60,80,.45)', topAccent: 'rgba(203,213,225,.6)',
      },
      {
        id: 'emerald', name: 'Emerald', dot: 'linear-gradient(160deg,#10b981,#064e3b)',
        panel: 'linear-gradient(178deg,#123b30 0%,#0d2b23 28%,#09201a 55%,#051410 100%)',
        rail: 'linear-gradient(160deg,#123b30,#082018)', railHover: 'linear-gradient(160deg,#1a4d3e,#0d2b23)',
        reader: 'linear-gradient(180deg,#0f3329 0%,#0a241c 30%,#05130e 100%)', context: 'linear-gradient(170deg,#133b30,#0a241c 90%)',
        accent: 'rgba(52,211,153,.28)', accentHover: 'rgba(52,211,153,.5)', accentStrong: 'rgba(110,231,183,.6)',
        icon: 'rgba(167,243,208,.75)', iconHover: '#fff', rowHover: 'linear-gradient(90deg,rgba(52,211,153,.14),rgba(52,211,153,.04))', rowSelected: 'linear-gradient(90deg,rgba(52,211,153,.22),rgba(52,211,153,.08))',
        inputBg: 'rgba(4,16,12,.5)', glow: 'rgba(16,140,100,.4)', railGlow: 'rgba(16,140,100,.45)', topAccent: 'rgba(110,231,183,.6)',
      },
      {
        id: 'ocean', name: 'Ocean', dot: 'linear-gradient(160deg,#0ea5e9,#0c4a6e)',
        panel: 'linear-gradient(178deg,#123b56 0%,#0d2c42 28%,#092034 55%,#05131f 100%)',
        rail: 'linear-gradient(160deg,#123b56,#082032)', railHover: 'linear-gradient(160deg,#1a4a6d,#0d2c42)',
        reader: 'linear-gradient(180deg,#0f3349 0%,#0a2334 30%,#05121c 100%)', context: 'linear-gradient(170deg,#133b56,#0a2334 90%)',
        accent: 'rgba(56,189,248,.28)', accentHover: 'rgba(56,189,248,.5)', accentStrong: 'rgba(125,211,252,.6)',
        icon: 'rgba(186,230,253,.75)', iconHover: '#fff', rowHover: 'linear-gradient(90deg,rgba(56,189,248,.14),rgba(56,189,248,.04))', rowSelected: 'linear-gradient(90deg,rgba(56,189,248,.22),rgba(56,189,248,.08))',
        inputBg: 'rgba(3,16,26,.5)', glow: 'rgba(14,120,190,.4)', railGlow: 'rgba(14,120,190,.45)', topAccent: 'rgba(125,211,252,.6)',
      },
      {
        id: 'rose', name: 'Rose', dot: 'linear-gradient(160deg,#f43f5e,#881337)',
        panel: 'linear-gradient(178deg,#4a1a2e 0%,#381322 28%,#2a0e1a 55%,#190710 100%)',
        rail: 'linear-gradient(160deg,#4a1a2e,#2a0e1a)', railHover: 'linear-gradient(160deg,#5e2138,#381322)',
        reader: 'linear-gradient(180deg,#3e1629 0%,#28101c 30%,#16060c 100%)', context: 'linear-gradient(170deg,#4a1a2e,#28101c 90%)',
        accent: 'rgba(251,113,133,.3)', accentHover: 'rgba(251,113,133,.5)', accentStrong: 'rgba(254,205,211,.6)',
        icon: 'rgba(255,228,230,.78)', iconHover: '#fff', rowHover: 'linear-gradient(90deg,rgba(251,113,133,.16),rgba(251,113,133,.05))', rowSelected: 'linear-gradient(90deg,rgba(251,113,133,.24),rgba(251,113,133,.08))',
        inputBg: 'rgba(22,6,12,.5)', glow: 'rgba(220,70,110,.45)', railGlow: 'rgba(220,70,110,.5)', topAccent: 'rgba(254,205,211,.6)',
      },
      {
        id: 'amber', name: 'Amber', dot: 'linear-gradient(160deg,#f59e0b,#7c2d12)',
        panel: 'linear-gradient(178deg,#4a2a10 0%,#381f0b 28%,#2a1608 55%,#1a0d04 100%)',
        rail: 'linear-gradient(160deg,#4a2a10,#2a1608)', railHover: 'linear-gradient(160deg,#5e3514,#381f0b)',
        reader: 'linear-gradient(180deg,#3e2510 0%,#28190a 30%,#160b04 100%)', context: 'linear-gradient(170deg,#4a2a10,#28190a 90%)',
        accent: 'rgba(251,191,36,.3)', accentHover: 'rgba(251,191,36,.52)', accentStrong: 'rgba(253,230,138,.62)',
        icon: 'rgba(254,240,199,.78)', iconHover: '#fff', rowHover: 'linear-gradient(90deg,rgba(251,191,36,.15),rgba(251,191,36,.05))', rowSelected: 'linear-gradient(90deg,rgba(251,191,36,.24),rgba(251,191,36,.08))',
        inputBg: 'rgba(22,12,4,.5)', glow: 'rgba(200,140,40,.4)', railGlow: 'rgba(200,140,40,.45)', topAccent: 'rgba(253,230,138,.6)',
      },
      {
        id: 'cyberpink', name: 'CyberPink', dot: 'linear-gradient(160deg,#ec4899,#6d28d9)',
        panel: 'linear-gradient(178deg,#3d0f3d 0%,#2e0a2e 28%,#240724 55%,#150415 100%)',
        rail: 'linear-gradient(160deg,#3d0f3d,#240724)', railHover: 'linear-gradient(160deg,#52154d,#2e0a2e)',
        reader: 'linear-gradient(180deg,#35102f 0%,#240920 30%,#120312 100%)', context: 'linear-gradient(170deg,#3d0f3d,#240920 90%)',
        accent: 'rgba(236,72,153,.32)', accentHover: 'rgba(236,72,153,.55)', accentStrong: 'rgba(244,180,227,.6)',
        icon: 'rgba(252,220,246,.78)', iconHover: '#fff', rowHover: 'linear-gradient(90deg,rgba(236,72,153,.16),rgba(236,72,153,.05))', rowSelected: 'linear-gradient(90deg,rgba(167,139,250,.26),rgba(167,139,250,.08))',
        inputBg: 'rgba(20,4,20,.5)', glow: 'rgba(220,70,170,.5)', railGlow: 'rgba(150,80,220,.5)', topAccent: 'rgba(244,180,227,.6)',
      },
      {
        id: 'midnight', name: 'Midnight', dot: 'linear-gradient(160deg,#3b82f6,#1e3a8a)',
        panel: 'linear-gradient(178deg,#12233f 0%,#0d1a31 28%,#091327 55%,#050b18 100%)',
        rail: 'linear-gradient(160deg,#12233f,#091327)', railHover: 'linear-gradient(160deg,#193052,#0d1a31)',
        reader: 'linear-gradient(180deg,#0f1e36 0%,#0a1526 30%,#040a14 100%)', context: 'linear-gradient(170deg,#12233f,#0a1526 90%)',
        accent: 'rgba(96,165,250,.3)', accentHover: 'rgba(96,165,250,.52)', accentStrong: 'rgba(191,219,254,.6)',
        icon: 'rgba(219,234,254,.78)', iconHover: '#fff', rowHover: 'linear-gradient(90deg,rgba(96,165,250,.15),rgba(96,165,250,.05))', rowSelected: 'linear-gradient(90deg,rgba(96,165,250,.24),rgba(96,165,250,.08))',
        inputBg: 'rgba(3,10,22,.5)', glow: 'rgba(40,110,220,.4)', railGlow: 'rgba(40,110,220,.45)', topAccent: 'rgba(191,219,254,.6)',
      },
      {
        id: 'orange', name: 'Ember', dot: 'linear-gradient(160deg,#fb923c,#9a3412)',
        panel: 'linear-gradient(178deg,#4a2a10 0%,#381f0b 26%,#241207 55%,#180b04 100%)',
        rail: 'linear-gradient(160deg,#4a2a10,#241207)', railHover: 'linear-gradient(160deg,#663a16,#381f0b)',
        reader: 'linear-gradient(180deg,#3e2410 0%,#28180a 30%,#150b04 100%)', context: 'linear-gradient(170deg,#4a2a10,#28180a 90%)',
        accent: 'rgba(251,146,60,.32)', accentHover: 'rgba(251,146,60,.54)', accentStrong: 'rgba(254,215,170,.62)',
        icon: 'rgba(255,237,213,.8)', iconHover: '#fff', rowHover: 'linear-gradient(90deg,rgba(251,146,60,.16),rgba(251,146,60,.05))', rowSelected: 'linear-gradient(90deg,rgba(251,146,60,.24),rgba(251,146,60,.08))',
        inputBg: 'rgba(22,10,4,.5)', glow: 'rgba(210,110,40,.42)', railGlow: 'rgba(210,110,40,.48)', topAccent: 'rgba(254,215,170,.6)',
      },
      {
        id: 'violet', name: 'Phantom', dot: 'linear-gradient(160deg,#a855f7,#581c87)',
        panel: 'linear-gradient(178deg,#3a1a54 0%,#2c123f 28%,#220c30 55%,#14061d 100%)',
        rail: 'linear-gradient(160deg,#3a1a54,#220c30)', railHover: 'linear-gradient(160deg,#4b236b,#2c123f)',
        reader: 'linear-gradient(180deg,#331849 0%,#231034 30%,#12051a 100%)', context: 'linear-gradient(170deg,#3a1a54,#231034 90%)',
        accent: 'rgba(192,132,252,.3)', accentHover: 'rgba(192,132,252,.52)', accentStrong: 'rgba(233,213,255,.6)',
        icon: 'rgba(243,232,255,.78)', iconHover: '#fff', rowHover: 'linear-gradient(90deg,rgba(192,132,252,.15),rgba(192,132,252,.05))', rowSelected: 'linear-gradient(90deg,rgba(192,132,252,.24),rgba(192,132,252,.08))',
        inputBg: 'rgba(18,5,28,.5)', glow: 'rgba(150,80,220,.42)', railGlow: 'rgba(150,80,220,.48)', topAccent: 'rgba(233,213,255,.6)',
      },
      // ---------------- LIGHT themes ----------------
      {
        id: 'paper', name: 'Paper', mode: 'light', dot: 'linear-gradient(135deg,#eef1f6,#c6cdd9)',
        panel: 'linear-gradient(178deg,#ffffff 0%,#f4f6fa 55%,#e9edf4 100%)',
        rail: 'linear-gradient(160deg,#fafbfd,#e7ebf2)', railHover: 'linear-gradient(160deg,#ffffff,#dde2ec)',
        reader: 'linear-gradient(180deg,#ffffff 0%,#f4f6fa 100%)', context: 'linear-gradient(175deg,#ffffff,#eef1f6 90%)',
        accent: 'rgba(99,102,241,.18)', accentHover: 'rgba(99,102,241,.32)', accentStrong: 'rgba(67,56,202,.55)',
        icon: 'rgba(55,65,81,.78)', iconHover: '#111827', rowHover: 'rgba(99,102,241,.09)', rowSelected: 'rgba(99,102,241,.16)',
        inputBg: 'rgba(255,255,255,.85)', glow: 'rgba(99,102,241,.25)', railGlow: 'rgba(99,102,241,.28)', topAccent: 'rgba(67,56,202,.6)',
      },
      {
        id: 'mist', name: 'Mist', mode: 'light', dot: 'linear-gradient(135deg,#dbeafe,#93b4f5)',
        panel: 'linear-gradient(178deg,#f7faff 0%,#eaf1fd 55%,#dde8f9 100%)',
        rail: 'linear-gradient(160deg,#fbfdff,#dce7f7)', railHover: 'linear-gradient(160deg,#ffffff,#cfddf3)',
        reader: 'linear-gradient(180deg,#ffffff 0%,#eef4fd 100%)', context: 'linear-gradient(175deg,#ffffff,#eaf1fd 90%)',
        accent: 'rgba(59,130,246,.18)', accentHover: 'rgba(59,130,246,.32)', accentStrong: 'rgba(29,78,216,.55)',
        icon: 'rgba(37,53,82,.8)', iconHover: '#0f172a', rowHover: 'rgba(59,130,246,.09)', rowSelected: 'rgba(59,130,246,.16)',
        inputBg: 'rgba(255,255,255,.85)', glow: 'rgba(59,130,246,.25)', railGlow: 'rgba(59,130,246,.28)', topAccent: 'rgba(29,78,216,.6)',
      },
      {
        id: 'frost', name: 'Frost', mode: 'light', dot: 'linear-gradient(135deg,#e0f2fe,#7dd3fc)',
        panel: 'linear-gradient(178deg,#f8feff 0%,#eaf8ff 55%,#dcf2fd 100%)',
        rail: 'linear-gradient(160deg,#fcfeff,#dbeeFA)', railHover: 'linear-gradient(160deg,#ffffff,#cfe9fa)',
        reader: 'linear-gradient(180deg,#ffffff 0%,#eef9ff 100%)', context: 'linear-gradient(175deg,#ffffff,#eaf8ff 90%)',
        accent: 'rgba(14,165,233,.18)', accentHover: 'rgba(14,165,233,.32)', accentStrong: 'rgba(3,105,161,.55)',
        icon: 'rgba(15,68,94,.8)', iconHover: '#082f49', rowHover: 'rgba(14,165,233,.09)', rowSelected: 'rgba(14,165,233,.16)',
        inputBg: 'rgba(255,255,255,.85)', glow: 'rgba(14,165,233,.25)', railGlow: 'rgba(14,165,233,.28)', topAccent: 'rgba(3,105,161,.6)',
      },
      {
        id: 'mint', name: 'Mint', mode: 'light', dot: 'linear-gradient(135deg,#d1fae5,#6ee7b7)',
        panel: 'linear-gradient(178deg,#f6fef9 0%,#e9fbf1 55%,#dcf7ea 100%)',
        rail: 'linear-gradient(160deg,#fcfffe,#dbeee3)', railHover: 'linear-gradient(160deg,#ffffff,#cef0dd)',
        reader: 'linear-gradient(180deg,#ffffff 0%,#effbf5 100%)', context: 'linear-gradient(175deg,#ffffff,#e9fbf1 90%)',
        accent: 'rgba(16,185,129,.18)', accentHover: 'rgba(16,185,129,.32)', accentStrong: 'rgba(4,120,87,.55)',
        icon: 'rgba(20,64,51,.8)', iconHover: '#064e3b', rowHover: 'rgba(16,185,129,.09)', rowSelected: 'rgba(16,185,129,.16)',
        inputBg: 'rgba(255,255,255,.85)', glow: 'rgba(16,185,129,.25)', railGlow: 'rgba(16,185,129,.28)', topAccent: 'rgba(4,120,87,.6)',
      },
      {
        id: 'breeze', name: 'Breeze', mode: 'light', dot: 'linear-gradient(135deg,#cffafe,#22d3ee)',
        panel: 'linear-gradient(178deg,#f4feff 0%,#e7fafc 55%,#d9f2f6 100%)',
        rail: 'linear-gradient(160deg,#fcfeff,#d5edf1)', railHover: 'linear-gradient(160deg,#ffffff,#c8e8ee)',
        reader: 'linear-gradient(180deg,#ffffff 0%,#edfafd 100%)', context: 'linear-gradient(175deg,#ffffff,#e7fafc 90%)',
        accent: 'rgba(6,182,212,.18)', accentHover: 'rgba(6,182,212,.32)', accentStrong: 'rgba(14,116,144,.55)',
        icon: 'rgba(14,58,68,.8)', iconHover: '#083344', rowHover: 'rgba(6,182,212,.09)', rowSelected: 'rgba(6,182,212,.16)',
        inputBg: 'rgba(255,255,255,.85)', glow: 'rgba(6,182,212,.25)', railGlow: 'rgba(6,182,212,.28)', topAccent: 'rgba(14,116,144,.6)',
      },
      {
        id: 'peach', name: 'Peach', mode: 'light', dot: 'linear-gradient(135deg,#ffe4e6,#fda4af)',
        panel: 'linear-gradient(178deg,#fff7f8 0%,#fdeaee 55%,#fbdfe6 100%)',
        rail: 'linear-gradient(160deg,#fffcfd,#f4dce3)', railHover: 'linear-gradient(160deg,#ffffff,#f2d1d9)',
        reader: 'linear-gradient(180deg,#ffffff 0%,#fdeff2 100%)', context: 'linear-gradient(175deg,#ffffff,#fdeaee 90%)',
        accent: 'rgba(244,114,182,.18)', accentHover: 'rgba(244,114,182,.32)', accentStrong: 'rgba(190,18,60,.5)',
        icon: 'rgba(88,42,60,.8)', iconHover: '#4c0519', rowHover: 'rgba(244,114,182,.09)', rowSelected: 'rgba(244,114,182,.16)',
        inputBg: 'rgba(255,255,255,.85)', glow: 'rgba(244,114,182,.25)', railGlow: 'rgba(244,114,182,.28)', topAccent: 'rgba(190,18,60,.55)',
      },
      {
        id: 'sunrise', name: 'Sunrise', mode: 'light', dot: 'linear-gradient(135deg,#fef3c7,#fbbf24)',
        panel: 'linear-gradient(178deg,#fffdf6 0%,#fdf5e2 55%,#f8eden4 100%)',
        rail: 'linear-gradient(160deg,#ffffff,#f1e5cb)', railHover: 'linear-gradient(160deg,#ffffff,#f0e0bf)',
        reader: 'linear-gradient(180deg,#ffffff 0%,#fdf7ea 100%)', context: 'linear-gradient(175deg,#ffffff,#fdf5e2 90%)',
        accent: 'rgba(245,158,11,.2)', accentHover: 'rgba(245,158,11,.36)', accentStrong: 'rgba(146,64,14,.55)',
        icon: 'rgba(74,54,36,.8)', iconHover: '#431407', rowHover: 'rgba(245,158,11,.1)', rowSelected: 'rgba(245,158,11,.18)',
        inputBg: 'rgba(255,255,255,.85)', glow: 'rgba(245,158,11,.28)', railGlow: 'rgba(245,158,11,.3)', topAccent: 'rgba(146,64,14,.6)',
      },
      {
        id: 'lavender', name: 'Lavender', mode: 'light', dot: 'linear-gradient(135deg,#ede9fe,#a78bfa)',
        panel: 'linear-gradient(178deg,#fcfaff 0%,#f3eeff 55%,#ebe4fb 100%)',
        rail: 'linear-gradient(160deg,#fffefe,#e0d6f5)', railHover: 'linear-gradient(160deg,#ffffff,#d9caef)',
        reader: 'linear-gradient(180deg,#ffffff 0%,#f6f2ff 100%)', context: 'linear-gradient(175deg,#ffffff,#f3eeff 90%)',
        accent: 'rgba(139,92,246,.18)', accentHover: 'rgba(139,92,246,.32)', accentStrong: 'rgba(109,40,217,.55)',
        icon: 'rgba(58,40,102,.8)', iconHover: '#2e1065', rowHover: 'rgba(139,92,246,.1)', rowSelected: 'rgba(139,92,246,.17)',
        inputBg: 'rgba(255,255,255,.85)', glow: 'rgba(139,92,246,.26)', railGlow: 'rgba(139,92,246,.28)', topAccent: 'rgba(109,40,217,.6)',
      },
      {
        id: 'slate', name: 'Slate', mode: 'light', dot: 'linear-gradient(135deg,#cbd5e1,#94a3b8)',
        panel: 'linear-gradient(178deg,#ffffff 0%,#f1f5f9 55%,#e2e8f0 100%)',
        rail: 'linear-gradient(160deg,#fbfcfe,#dbe1ea)', railHover: 'linear-gradient(160deg,#ffffff,#cdd5e0)',
        reader: 'linear-gradient(180deg,#ffffff 0%,#f4f7fa 100%)', context: 'linear-gradient(175deg,#ffffff,#f1f5f9 90%)',
        accent: 'rgba(100,116,139,.18)', accentHover: 'rgba(100,116,139,.32)', accentStrong: 'rgba(51,65,85,.55)',
        icon: 'rgba(51,65,85,.8)', iconHover: '#0f172a', rowHover: 'rgba(100,116,139,.1)', rowSelected: 'rgba(100,116,139,.17)',
        inputBg: 'rgba(255,255,255,.85)', glow: 'rgba(100,116,139,.26)', railGlow: 'rgba(100,116,139,.28)', topAccent: 'rgba(51,65,85,.6)',
      },
      {
        id: 'bone', name: 'Bone', mode: 'light', dot: 'linear-gradient(135deg,#f5f5f4,#d6d3d1)',
        panel: 'linear-gradient(178deg,#fdfdfc 0%,#f2f1ef 55%,#e7e5e2 100%)',
        rail: 'linear-gradient(160deg,#fcfbfa,#dad8d3)', railHover: 'linear-gradient(160deg,#ffffff,#cfccc6)',
        reader: 'linear-gradient(180deg,#ffffff 0%,#f3f2f0 100%)', context: 'linear-gradient(175deg,#ffffff,#f2f1ef 90%)',
        accent: 'rgba(120,113,108,.2)', accentHover: 'rgba(120,113,108,.34)', accentStrong: 'rgba(68,64,60,.55)',
        icon: 'rgba(68,64,60,.82)', iconHover: '#1c1917', rowHover: 'rgba(120,113,108,.1)', rowSelected: 'rgba(120,113,108,.17)',
        inputBg: 'rgba(255,255,255,.85)', glow: 'rgba(120,113,108,.26)', railGlow: 'rgba(120,113,108,.28)', topAccent: 'rgba(68,64,60,.6)',
      },
    ];
    function applyTheme(id) {
      var t = null;
      for (var i = 0; i < THEMES.length; i++) { if (THEMES[i].id === id) { t = THEMES[i]; break; } }
      if (!t) t = THEMES[0];
      store.theme = t.id;
      var vars = cssVars(t, TEXT[t.id] || TEXT.indigo);
      var keys = Object.keys(vars);
      for (var k = 0; k < keys.length; k++) document.documentElement.style.setProperty(keys[k], vars[keys[k]]);
      try { localStorage.setItem('fm-theme', t.id); } catch (e) {}
      emit();
    }
    function initTheme() {
      var saved = null;
      try { saved = localStorage.getItem('fm-theme'); } catch (e) {}
      applyTheme(saved || 'indigo');
    }
    function toggleThemePicker() { store.themeOpen = !store.themeOpen; emit(); }

    // ========================= React components =========================
    function ThemePicker() {
      var s = useStore();
      if (!s.themeOpen) return null;
      var active = s.theme;
      var swatch = function (t) {
        return react.createElement('button', {
          key: t.id, className: 'fm-theme-swatch' + (t.id === active ? ' active' : ''),
          title: t.name, onClick: function () { applyTheme(t.id); store.themeOpen = false; emit(); },
        },
          react.createElement('span', { className: 'fm-theme-dot', style: { background: t.dot } }),
          react.createElement('span', { className: 'fm-theme-name' }, t.name)
        );
      };
      var dark = [], light = [];
      THEMES.forEach(function (t) { if (t.mode === 'light') light.push(swatch(t)); else dark.push(swatch(t)); });
      return react.createElement(react.Fragment, null,
        react.createElement('div', { className: 'fm-theme-bg', onClick: function () { store.themeOpen = false; emit(); } }),
        react.createElement('div', { className: 'fm-theme-picker', style: { bottom: 8, right: 10 } },
          react.createElement('div', { className: 'fm-theme-title' }, 'Theme'),
          dark.length ? react.createElement('div', { className: 'fm-theme-group' },
            react.createElement('div', { className: 'fm-theme-group-label' }, 'Dark'),
            react.createElement('div', { className: 'fm-theme-grid' }, dark)) : null,
          light.length ? react.createElement('div', { className: 'fm-theme-group' },
            react.createElement('div', { className: 'fm-theme-group-label' }, 'Light'),
            react.createElement('div', { className: 'fm-theme-grid' }, light)) : null
        )
      );
    }

    function ToggleButton() {
      var s = useStore();
      return react.createElement('button', {
        className: 'fm-toggle' + (s.open ? ' fm-toggle-on' : ''),
        title: 'File manager', 'aria-label': 'File manager',
        onClick: function () { setOpen(!s.open); },
      },
        react.createElement(Icon, { name: 'folder', size: 15 }),
        react.createElement('span', { className: 'fm-toggle-label' }, s.open ? 'Close Files' : 'Files')
      );
    }

    function ContextMenu() {
      var s = useStore();
      var m = s.menu;
      if (!m) return null;
      var items = [];
      if (m.isRoot) {
        // Root menu: create + reveal + copy, no rename/delete on the workspace root.
        items.push(react.createElement('div', {
          key: 'newf', className: 'fm-ctx-item', onClick: function () { newFile(m.path); },
        }, react.createElement('span', { className: 'ic' }, react.createElement(Icon, { name: 'filePlus', size: 14 })), 'New file'));
        items.push(react.createElement('div', {
          key: 'newd', className: 'fm-ctx-item', onClick: function () { newFolder(m.path); },
        }, react.createElement('span', { className: 'ic' }, react.createElement(Icon, { name: 'folderPlus', size: 14 })), 'New folder'));
        items.push(react.createElement('div', { key: 's0', className: 'fm-ctx-sep' }));
        items.push(react.createElement('div', {
          key: 'reveal', className: 'fm-ctx-item', onClick: function () { doReveal(m); },
        }, react.createElement('span', { className: 'ic' }, react.createElement(Icon, { name: 'reveal', size: 14 })), 'Reveal in Finder'));
        items.push(react.createElement('div', {
          key: 'copy', className: 'fm-ctx-item', onClick: function () { copyPath(m.path); },
        }, react.createElement('span', { className: 'ic' }, react.createElement(Icon, { name: 'copy', size: 14 })), 'Copy path'));
        items.push(react.createElement('div', { key: 's1', className: 'fm-ctx-sep' }));
        items.push(react.createElement('div', {
          key: 'open', className: 'fm-ctx-item', onClick: function () { doOpen(m); },
        }, react.createElement('span', { className: 'ic' }, react.createElement(Icon, { name: 'folder', size: 14 })), 'Open folder in app'));
        return react.createElement(react.Fragment, null,
          react.createElement('div', { className: 'fm-context-bg', onClick: closeContext, onContextMenu: function (e) { e.preventDefault(); closeContext(); } }),
          react.createElement('div', {
            className: 'fm-context', style: { left: Math.min(m.x, window.innerWidth - 200), top: Math.min(m.y, window.innerHeight - items.length * 30 - 20) },
          }, ...items)
        );
      }
      // Common actions
      items.push(react.createElement('div', {
        key: 'preview', className: 'fm-ctx-item', onClick: function () { if (m.isDir) toggleDir(m.path); else openPreview(m.path, m.name); },
      }, react.createElement('span', { className: 'ic' }, react.createElement(Icon, { name: m.isDir ? 'folder' : 'eye', size: 14 })), m.isDir ? 'Expand / Collapse' : 'Preview'));
      if (!m.isDir) {
        items.push(react.createElement('div', {
          key: 'edit', className: 'fm-ctx-item', onClick: function () { openPreview(m.path, m.name); toggleEdit(); },
        }, react.createElement('span', { className: 'ic' }, react.createElement(Icon, { name: 'edit', size: 14 })), 'Edit'));
      }
      items.push(react.createElement('div', {
        key: 'copy', className: 'fm-ctx-item', onClick: function () { copyPath(m.path); },
      }, react.createElement('span', { className: 'ic' }, react.createElement(Icon, { name: 'copy', size: 14 })), 'Copy path'));
      if (!m.isDir) {
        items.push(react.createElement('div', {
          key: 'download', className: 'fm-ctx-item', onClick: function () { closeContext(); downloadPath(m.path); },
        }, react.createElement('span', { className: 'ic' }, react.createElement(Icon, { name: 'download', size: 14 })), 'Download'));
      }
      items.push(react.createElement('div', { key: 's1', className: 'fm-ctx-sep' }));
      items.push(react.createElement('div', {
        key: 'rename', className: 'fm-ctx-item', onClick: function () { promptRename(m); },
      }, react.createElement('span', { className: 'ic' }, react.createElement(Icon, { name: 'edit', size: 14 })), 'Rename...'));
      if (m.isDir) {
        items.push(react.createElement('div', {
          key: 'newf', className: 'fm-ctx-item', onClick: function () { newFile(m.path); },
        }, react.createElement('span', { className: 'ic' }, react.createElement(Icon, { name: 'filePlus', size: 14 })), 'New file'));
        items.push(react.createElement('div', {
          key: 'newd', className: 'fm-ctx-item', onClick: function () { newFolder(m.path); },
        }, react.createElement('span', { className: 'ic' }, react.createElement(Icon, { name: 'folderPlus', size: 14 })), 'New folder'));
      }
      items.push(react.createElement('div', {
        key: 'del', className: 'fm-ctx-item danger', onClick: function () { confirmDelete(m); },
      }, react.createElement('span', { className: 'ic' }, react.createElement(Icon, { name: 'trash', size: 14 })), 'Delete'));
      items.push(react.createElement('div', { key: 's2', className: 'fm-ctx-sep' }));
      items.push(react.createElement('div', {
        key: 'open', className: 'fm-ctx-item', onClick: function () { doOpen(m); },
      }, react.createElement('span', { className: 'ic' }, react.createElement(Icon, { name: 'open', size: 14 })), 'Open with app'));
      items.push(react.createElement('div', {
        key: 'reveal', className: 'fm-ctx-item', onClick: function () { doReveal(m); },
      }, react.createElement('span', { className: 'ic' }, react.createElement(Icon, { name: 'reveal', size: 14 })), 'Reveal in Finder'));
      if (!m.isDir) {
        items.push(react.createElement('div', {
          key: 'vscode', className: 'fm-ctx-item', onClick: function () { doOpenVscode(m); },
        }, react.createElement('span', { className: 'ic' }, react.createElement(Icon, { name: 'code', size: 14 })), 'Open in VS Code'));
      }
      var style = {
        left: Math.min(m.x, window.innerWidth - 200),
        top: Math.min(m.y, window.innerHeight - items.length * 30 - 20),
      };
      return react.createElement(react.Fragment, null,
        react.createElement('div', { className: 'fm-context-bg', onClick: closeContext, onContextMenu: function (e) { e.preventDefault(); closeContext(); } }),
        react.createElement('div', { className: 'fm-context', style: style }, ...items)
      );
    }

    function Toast() {
      var s = useStore();
      if (!s.toast) return null;
      return react.createElement('div', { className: 'fm-toast' + (s.toast.error ? ' error' : '') }, s.toast.text);
    }

    function TreeNode(props) {
      var entry = props.entry;
      var tree = props.tree;
      var isDir = entry.type === 'directory';
      var expanded = tree.expanded.has(entry.path);
      var loading = tree.loading.has(entry.path);
      var error = tree.errors[entry.path];
      var children = tree.cache.get(entry.path);
      var onToggle = props.onToggle, onOpen = props.onOpen, onEnter = props.onEnter, onSelect = props.onSelect;
      var multi = props.multi, selected = props.selected;
      var isChecked = multi && selected;
      var row = react.createElement('div', {
        className: 'fm-row' + ((tree.selected === entry.path) ? ' fm-row-selected' : '') + (isChecked ? ' fm-row-checked' : ''),
        style: { paddingLeft: 6 + props.depth * 14 },
        'data-path': entry.path,
        onClick: function (e) {
          if (clickSkips) { clickSkips = false; return; }
          if (multi) { onSelect(entry.path); return; }
          if ((e.ctrlKey || e.metaKey) && !isDir) { if (onSelect) onSelect(entry.path); return; }
          // Single click: just highlight the row (no open). Double click opens.
          tree.selected = entry.path; emit();
          if (isDir) onToggle(entry.path);
        },
        onDoubleClick: function () { if (isDir && onEnter) onEnter(entry); else if (!isDir) onOpen(entry, false); },
        onContextMenu: function (e) { openContext(e, entry); },
      },
        // Checkbox column: always visible in multi-select so the target is obvious. Clicking it (or the row) toggles selection.
        multi ? react.createElement('span', {
          className: 'fm-check' + (isChecked ? ' on' : ''),
          title: 'Toggle select',
          onClick: function (e) { e.stopPropagation(); onSelect(entry.path); },
        }, isChecked ? react.createElement(Icon, { name: 'check', size: 10 }) : null) : null,
        react.createElement('span', { className: 'fm-chevron' + (isDir ? '' : ' fm-chevron-none') },
          isDir ? react.createElement(Icon, { name: expanded ? 'chevronDown' : 'chevronRight', size: 12 }) : null),
        react.createElement('span', { className: 'fm-node-icon' + (isDir ? ' fm-node-dir' : '') },
          isDir ? react.createElement(Icon, { name: expanded ? 'folderOpen' : 'folder', size: 14 })
            : react.createElement(FileIcon, { name: entry.name, size: 15 })),
        react.createElement('span', { className: 'fm-node-name', title: entry.path }, entry.name),
        isDir && loading ? react.createElement('span', { className: 'fm-node-loading' }, '…') : null,
        !isDir && typeof entry.size === 'number' ? react.createElement('span', { className: 'fm-node-size' }, fmtSize(entry.size)) : null,
        typeof entry.mtime === 'number' ? react.createElement('span', { className: 'fm-node-mtime' }, fmtDate(entry.mtime)) : null
      );
      var nodes = [row];
      if (isDir && expanded) {
        if (children) {
          children.forEach(function (child) {
            nodes.push(react.createElement(TreeNode, {
              key: child.path, entry: child, depth: props.depth + 1, tree: tree,
              onToggle: onToggle, onOpen: onOpen, onEnter: onEnter, onSelect: onSelect,
              multi: props.multi, selected: multi && props.selectedSet ? props.selectedSet.has(child.path) : false, selectedSet: props.selectedSet,
            }));
          });
        } else if (!loading && error) {
          nodes.push(react.createElement('div', { key: '__err', className: 'fm-node-error', style: { paddingLeft: 6 + (props.depth + 1) * 14 } }, error));
        }
      }
      return react.createElement('div', { className: 'fm-node' }, ...nodes);
    }

    function SearchResults() {
      var s = useStore();
      if (!s.matches) return null;
      var rows = s.matches.map(function (M) {
        return react.createElement('div', {
          key: M.path, className: 'fm-row', title: M.path, 'data-path': M.path,
          style: { paddingLeft: 8 },
          onContextMenu: function (e) { openContext(e, M); },
          onClick: function () { if (clickSkips) { clickSkips = false; return; } if (M.type === 'directory') { toggleDir(M.path); } else { if (s.tree) { s.tree.selected = M.path; } emit(); } },
          onDoubleClick: function () { if (M.type !== 'directory') openPreview(M.path, M.name); },
        },
          react.createElement('span', { className: 'fm-node-icon' + (M.type === 'directory' ? ' fm-node-dir' : '') },
            M.type === 'directory' ? react.createElement(Icon, { name: 'folder', size: 14 })
              : react.createElement(FileIcon, { name: M.name, size: 15 })),
          react.createElement('span', { className: 'fm-node-name', title: M.path }, M.name)
        );
      });
      return react.createElement('div', null, ...rows);
    }

    function Reader() {
      var s = useStore();
      var p = s.preview;
      if (!p) return null;
      // Sibling file list for quick prev/next navigation (files in the same directory).
      var siblings = [], curIdx = -1;
      var par = store.tree ? dirnameOf(p.path) : null;
      if (par && store.tree && store.tree.cache) {
        var kids = store.tree.cache.get(par) || [];
        siblings = sortEntries(kids, store.sortBy).filter(function (e) { return e.type !== 'directory'; });
        for (var si = 0; si < siblings.length; si++) { if (siblings[si].path === p.path) { curIdx = si; break; } }
      }
      var navPrev = function () {
        if (!siblings.length || curIdx - 1 < 0) return;
        var nx = siblings[curIdx - 1];
        api.read(nx.path).then(function (res) {
          store.preview = { path: nx.path, name: nx.name, size: res.size, tooLarge: !!res.tooLarge, error: res.error, content: res.content, editing: false };
          emit();
        });
      };
      var navNext = function () {
        if (!siblings.length || curIdx + 1 >= siblings.length) return;
        var nx = siblings[curIdx + 1];
        api.read(nx.path).then(function (res) {
          store.preview = { path: nx.path, name: nx.name, size: res.size, tooLarge: !!res.tooLarge, error: res.error, content: res.content, editing: false };
          emit();
        });
      };
      var body = null;
      var extra = [];
      if (p.error) {
        body = react.createElement('div', { className: 'fm-reader-message', key: 'm' }, 'Error: ' + p.error);
      } else if (p.tooLarge) {
        body = react.createElement('div', { className: 'fm-reader-message', key: 'm' }, 'File too large to preview (' + fmtSize(p.size) + '). Open with the app instead.');
      } else if (p.editing) {
        body = react.createElement('textarea', {
          id: 'fm-edit-area', key: 'ta', className: 'fm-edit-area', defaultValue: p.content, autoFocus: true,
          onKeyDown: function (e) {
            if ((e.metaKey || e.ctrlKey) && (e.key === 's' || e.key === 'S')) { e.preventDefault(); saveEdit(); }
          },
        });
        extra.push(react.createElement('button', { key: 'save', className: 'fm-icon-btn', title: 'Save (Ctrl/Cmd+S)', onClick: saveEdit }, react.createElement(Icon, { name: 'check', size: 16 })),
          react.createElement('button', { key: 'ed2', className: 'fm-icon-btn', title: 'Back to view', onClick: toggleEdit }, react.createElement(Icon, { name: 'edit', size: 16 })));
      } else {
        var isMd = isMarkdown(p.name);
        var ftype = fileTypeKey(p.name);
        var ext = (String(p.name).toLowerCase().match(/\.[^.]+$/) || [''])[0];
        var rawSrc = function () { return BASE + '/raw?path=' + encodeURIComponent(p.path); };
        if (isMd) {
          body = react.createElement('div', { key: 'body', className: 'fm-reader-body md', dangerouslySetInnerHTML: { __html: renderMarkdown(p.content || '') } });
          extra.push(react.createElement('button', { key: 'ed', className: 'fm-icon-btn', title: 'Edit', onClick: toggleEdit }, react.createElement(Icon, { name: 'edit', size: 16 })));
        } else if (/\.(html?|svg)$/i.test(p.name)) {
          // Render HTML/SVG in a sandboxed iframe (browser-like), not as plain text.
          body = react.createElement('iframe', {
            key: 'frame', className: 'fm-reader-frame', src: rawSrc(), sandbox: 'allow-scripts allow-same-origin', title: p.name,
          });
        } else if (ext === '.pdf') {
          body = react.createElement('iframe', { key: 'frame', className: 'fm-reader-frame', src: rawSrc(), title: p.name });
        } else if (ftype === 'image') {
          body = react.createElement('div', { key: 'imgwrap', className: 'fm-reader-media' },
            react.createElement('img', { src: rawSrc(), alt: p.name, className: 'fm-reader-img' }));
        } else if (ftype === 'video') {
          body = react.createElement('div', { key: 'vidwrap', className: 'fm-reader-media' },
            react.createElement('video', { src: rawSrc(), controls: true, className: 'fm-reader-video', autoPlay: false }));
        } else if (ftype === 'audio') {
          body = react.createElement('div', { key: 'audwrap', className: 'fm-reader-media' },
            react.createElement('audio', { src: rawSrc(), controls: true, className: 'fm-reader-audio' }));
        } else {
          // Text / code: highlight as before.
          body = react.createElement('div', { key: 'body', className: 'fm-reader-body', dangerouslySetInnerHTML: { __html: highlightLine(p.content || '') } });
          extra.push(react.createElement('button', { key: 'ed', className: 'fm-icon-btn', title: 'Edit', onClick: toggleEdit }, react.createElement(Icon, { name: 'edit', size: 16 })));
          extra.push(react.createElement('button', { key: 'dl', className: 'fm-icon-btn', title: 'Open in app', onClick: function () { doOpen(p); } }, react.createElement(Icon, { name: 'open', size: 16 })));
        }
      }
      return react.createElement('div', { className: 'fm-reader' },
        react.createElement('div', { className: 'fm-reader-bar' },
          react.createElement('div', { className: 'fm-reader-nav' },
            react.createElement('button', { className: 'fm-icon-btn' + (curIdx <= 0 ? ' fm-disabled' : ''), title: 'Previous file (▲)', onClick: navPrev }, react.createElement(Icon, { name: 'chevronUp', size: 13 })),
            react.createElement('button', { className: 'fm-icon-btn' + (curIdx < 0 || curIdx + 1 >= siblings.length ? ' fm-disabled' : ''), title: 'Next file (▼)', onClick: navNext }, react.createElement(Icon, { name: 'chevronDown', size: 13 })),
            react.createElement('span', { className: 'fm-reader-idx' }, (curIdx >= 0 ? curIdx + 1 : '-') + ' / ' + (siblings.length || '-'))
          ),
          react.createElement('span', { className: 'fm-reader-name', title: p.path }, p.name),
          react.createElement('span', { className: 'fm-node-size', style: { flex: 'none' } }, p.size != null && !p.tooLarge ? fmtSize(p.size) : ''),
          react.createElement('div', { className: 'fm-reader-actions' },
            ...extra,
            react.createElement('button', { key: 'close', className: 'fm-icon-btn', title: 'Close', onClick: closeReader }, react.createElement(Icon, { name: 'close', size: 16 }))
          )
        ),
        body
      );
    }

    function ExplorerPanel(props) {
      var s = useStore();
      var root = s.rootPath;
      var name = s.rootName;
      var tree = s.tree;
      var currentSessionId = props && props.useSessions ? props.useSessions(function (st) { return st.current; }) : null;
      var wsItems = props && props.useWorkspaces ? props.useWorkspaces(function (st) { return st.items; }) : [];
      var recentWorkspaceId = props && props.useWorkspaces ? props.useWorkspaces(function (st) { return st.recentWorkspaceId; }) : null;

      var wantPath = null, wantName = '';
      if (currentSessionId) {
        wsItems.forEach(function (w) {
          if (!wantPath && w.sessionIds && w.sessionIds.indexOf(currentSessionId) >= 0) { wantPath = w.path; wantName = w.title; }
        });
      }
      if (!wantPath && recentWorkspaceId) {
        wsItems.forEach(function (w) {
          if (!wantPath && w.workspaceId === recentWorkspaceId) { wantPath = w.path; wantName = w.title; }
        });
      }
      if (!wantPath && wsItems.length > 0) { wantPath = wsItems[0].path; wantName = wsItems[0].title; }

      // Re-root when the active workspace changes.
      react.useEffect(function () {
        if (wantPath && store.rootPath !== wantPath) {
          store.preview = null;
          store.searchRoot = wantPath; // search always scans the workspace root
          initTree(wantPath, wantName || '');
        }
      }, [wantPath, wantName]);

      // Keyboard shortcuts: Esc closes reader/search, Ctrl/Cmd+F focuses search, F2 renames.
      react.useEffect(function () {
        function onKey(e) {
          var k = (e.key || '').toLowerCase();
          if (k === 'escape') {
            if (store.preview) { closeReader(); e.preventDefault(); }
            else if (store.query) { setQuery(''); }
            else if (store.themeOpen) { store.themeOpen = false; emit(); }
            else if (store.menu) { closeContext(); }
            return;
          }
          if ((e.ctrlKey || e.metaKey) && k === 'f') {
            e.preventDefault();
            if (!store.open) setOpen(true);
            var inp = document.querySelector('input.fm-search-input input, .fm-search-input input');
            if (inp) { setTimeout(function () { inp.focus(); }, 40); }
            return;
          }
          if (k === 'f2') {
            if (store.open && tree && tree.selected) {
              var sel = null;
              var rc = tree.cache.get(tree.rootPath) || [];
              var stack = rc.slice();
              while (stack.length) { var it = stack.shift(); if (it.path === tree.selected) { sel = it; break; } stack = stack.concat(tree.cache.get(it.path) || []); }
              if (sel) promptRename(sel);
            }
          }
        }
        document.addEventListener('keydown', onKey);
        function onGlobalMove(ev) { onTreeDragMove(ev); }
        function onGlobalUp() { onTreeDragEnd(); }
        document.addEventListener('mousemove', onGlobalMove);
        document.addEventListener('mouseup', onGlobalUp);
        return function () {
          document.removeEventListener('keydown', onKey);
          document.removeEventListener('mousemove', onGlobalMove);
          document.removeEventListener('mouseup', onGlobalUp);
        };
      }, []);

      var treeDom = null;
      if (tree) {
        var rootChildren = tree.cache.get(tree.rootPath);
        if (rootChildren && rootChildren.length === 0) {
          treeDom = react.createElement('div', { className: 'fm-empty' }, 'Empty folder');
        } else if (rootChildren) {
          var filtered = store.showDot ? rootChildren : rootChildren.filter(function (c) { return c.name.indexOf('.') !== 0; });
          var topNodes = [];
          sortEntries(filtered, s.sortBy).forEach(function (child) {
            topNodes.push(react.createElement(TreeNode, {
              key: child.path, entry: child, depth: 0, tree: tree,
              onToggle: toggleDir, onOpen: function (e, single) { openPreview(e.path, e.name); },
              onEnter: enterDir, onSelect: toggleSel, multi: store.multi, selected: store.sel.has(child.path), selectedSet: store.sel,
            }));
          });
          treeDom = react.createElement('div', { className: 'fm-tree', onMouseDown: startTreeDrag }, ...topNodes);
        }
      }
      if (!tree && !wantPath) {
        treeDom = react.createElement('div', { className: 'fm-empty' }, 'No workspace selected');
      }
      // Reader overlay (full-screen preview) lives above everything, independent of panel openness.
      var reader = react.createElement(Reader, null);

      // Closed state: a slim rail flush to the right edge so it is reachable and tight.
      var rail = react.createElement('div', {
        className: 'fm-rail',
        title: 'Open file manager',
        onClick: function () { setOpen(true); },
      }, react.createElement(Icon, { name: 'chevronLeft', size: 16 }));

      var panel = s.open
        ? react.createElement('div', {
            className: 'fm-panel',
            style: { width: 'var(--fm-panel-width)' },
            onContextMenu: openRootContext,
          },
            react.createElement('div', {
              className: 'fm-resize',
              onMouseDown: startResize,
              title: 'Drag to resize',
            }),
            react.createElement('div', { className: 'fm-header' },
              react.createElement('span', { className: 'fm-header-title', title: root || '' }, react.createElement(Icon, { name: 'files', size: 14 }), name || 'Files'),
              react.createElement('button', { className: 'fm-theme-btn', title: 'Theme', onClick: toggleThemePicker }, react.createElement('span', { className: 'fm-dot', style: { width: 12, height: 12, borderRadius: 6 } })),
              react.createElement('button', { className: 'fm-icon-btn', title: 'Refresh', onClick: refreshAll }, react.createElement(Icon, { name: 'refresh', size: 14 })),
              react.createElement('button', { className: 'fm-icon-btn', title: 'New file', onClick: function () { newFile(root); } }, react.createElement(Icon, { name: 'filePlus', size: 14 })),
              react.createElement('button', { className: 'fm-icon-btn', title: 'New folder', onClick: function () { newFolder(root); } }, react.createElement(Icon, { name: 'folderPlus', size: 14 })),
              react.createElement('button', { className: 'fm-icon-btn', title: 'Collapse', onClick: function () { setOpen(false); } }, react.createElement(Icon, { name: 'close', size: 14 }))
            ),
            react.createElement('div', { className: 'fm-search' },
              react.createElement(Icon, { name: 'search', size: 13 }),
              react.createElement('div', { className: 'fm-search-input' },
                react.createElement('input', {
                  placeholder: 'Search files...', value: s.query,
                  onChange: function (e) { setQuery(e.target.value); },
                }),
                s.query ? react.createElement('button', {
                  className: 'fm-search-clear', title: 'Clear search', 'aria-label': 'Clear search',
                  onClick: function () { setQuery(''); },
                }, '×') : null
              )
            ),
            react.createElement('div', { className: 'fm-toolbar' },
              store.navStack.length ? react.createElement('button', { className: 'fm-icon-btn', title: 'Back', onClick: goBackDir }, react.createElement(Icon, { name: 'chevronLeft', size: 13 })) : null,
              react.createElement('button', { className: 'fm-icon-btn' + (store.multi ? ' fm-active' : ''), title: 'Multi-select', onClick: function () { toggleMulti(!store.multi); } }, react.createElement(Icon, { name: 'check', size: 13 })),
              react.createElement('button', { className: 'fm-icon-btn' + (store.showDot ? ' fm-active' : ''), title: store.showDot ? 'Hide hidden files' : 'Show hidden files', onClick: function () { store.showDot = !store.showDot; emit(); } }, react.createElement('span', { style: { fontSize: 12, lineHeight: 1 } }, '·')),
              react.createElement('span', { className: 'fm-toolbar-count', title: root || '' }, name || root || ''),
              react.createElement('select', {
                className: 'fm-sort-select', value: s.sortBy,
                onChange: function (e) { setSort(e.target.value); },
                title: 'Sort by',
              },
                react.createElement('option', { value: 'name' }, 'Name'),
                react.createElement('option', { value: 'type' }, 'Type'),
                react.createElement('option', { value: 'size' }, 'Size'),
                react.createElement('option', { value: 'mtime' }, 'Modified'),
              )
            ),
            store.multi && store.sel.size ? react.createElement('div', { className: 'fm-batchbar' },
              react.createElement('span', { className: 'fm-batchcount' }, store.sel.size + ' selected'),
              react.createElement('button', { className: 'fm-icon-btn danger', title: 'Delete selected', onClick: batchDelete }, react.createElement(Icon, { name: 'trash', size: 13 })),
              react.createElement('button', { className: 'fm-icon-btn', title: 'Copy paths', onClick: batchCopy }, react.createElement(Icon, { name: 'copy', size: 13 })),
              react.createElement('button', { className: 'fm-icon-btn', title: 'Clear', onClick: function () { store.sel = new Set(); emit(); } }, '×')
            ) : null,
            react.createElement('div', { className: 'fm-breadcrumb' },
              (function () {
                var segs = crunch(root);
                var links = segs.map(function (seg, i) {
                  var last = i === segs.length - 1;
                  return react.createElement('span', {
                    key: seg.full, className: 'fm-crumb' + (last ? ' last' : ''), title: seg.full,
                    onClick: function () { if (!last) goToSegment(seg.full); },
                  }, seg.name, !last ? react.createElement('span', { className: 'fm-crumb-sep' }, '/') : null);
                });
                return links;
              })()
            ),
            s.matches ? react.createElement('div', { className: 'fm-tree', onMouseDown: startTreeDrag }, react.createElement(SearchResults, null)) : treeDom
          )
        : rail;

      return react.createElement(react.Fragment, null,
        reader,
        panel,
        react.createElement(ContextMenu, null),
        react.createElement(ThemePicker, null),
        react.createElement(Toast, null),
        s.dragging ? react.createElement('div', { className: 'fm-drag-capture' }) : null,
        s.rubber ? react.createElement('div', { className: 'fm-band', style: { left: s.rubber.x1, top: s.rubber.y1, width: Math.max(0, s.rubber.x2 - s.rubber.x1), height: Math.max(0, s.rubber.y2 - s.rubber.y1) } }) : null
      );
    }

    // ========================= apply =========================
    var inject = ['slots'];
    function apply(ctx) {
      injectCss();
      initTheme();
      var slots = ctx.get('slots');
      if (slots === undefined) return;
      function registerPanel() {
        return slots.register(
          { name: 'shell.overlay', id: 'file-manager', order: 90, label: 'file-manager' },
          function (props) { return react.createElement(ExplorerPanel, props); }
        );
      }
      function registerToggle() {
        return slots.register(
          { name: 'conversation.session.header.actions', id: 'file-manager-toggle', order: 30, label: 'file-manager' },
          function (props) { return react.createElement(ToggleButton, props); }
        );
      }
      // Prefer inject() so registration waits for the slot owner; fall back to a direct register.
      if (typeof slots.inject === 'function') {
        slots.inject('shell.overlay', registerPanel);
        slots.inject('conversation.session.header.actions', registerToggle);
      } else {
        registerPanel();
        registerToggle();
      }
      // Always-on floating launcher so the panel is discoverable from anywhere.
      var launcher = document.createElement('button');
      launcher.textContent = '📂';
      launcher.className = 'fm-overlay-fallback';
      launcher.onclick = function () { setOpen(!store.open); };
      document.body.appendChild(launcher);
      ctx.effect(function () { if (launcher && launcher.parentNode) launcher.parentNode.removeChild(launcher); });
      ctx.effect(function () { return function () { document.documentElement.removeAttribute('data-fm-open'); }; });
    }

    exports.apply = apply;
    exports.inject = inject;
    return module.exports;
  }
});
