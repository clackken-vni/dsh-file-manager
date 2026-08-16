/**
 * dsh-file-manager — host half.
 *
 * Registers the /plugins/file-manager/* HTTP routes for the web file-manager
 * panel (list / read / write / rename / delete / mkdir / touch / search /
 * open / reveal / open-vscode). The routes are served by the same web server
 * as the GUI (`webServer` / `httpServer` dual-key compatible), so the browser
 * client fetches them from the page origin — no need to touch the closed
 * RpcMethodMap.
 *
 * Reads/writes resolve through `ctx.fs` when present (respecting the mounted
 * provider / sandbox); structural primitives that `ctx.fs` deliberately omits
 * (rename / delete / mkdir / unlink / copy/move) fall back to node:fs on the
 * only path the host itself owns. The client never joins path segments.
 *
 * @module dsh-file-manager
 */

import { promises as nodeFs } from 'node:fs'
import { dirname, join } from 'node:path'

export const name = 'file-manager'
export const inject = ['fs']

const MAX_READ = 1_000_000

export function apply(ctx) {
  const fs = ctx.fs || nodeFs
  const message = (err) => String((err && err.message) || err)

  const readBody = async (req) => {
    const chunks = []
    for await (const chunk of req) chunks.push(chunk)
    return Buffer.concat(chunks).toString('utf8')
  }
  const send = (res, status, obj) => {
    res.writeHead(status, {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store',
    })
    res.end(JSON.stringify(obj))
  }
  const param = (req, key) => {
    try {
      return new URL(req.url ?? '/', 'http://x').searchParams.get(key)
    } catch {
      return null
    }
  }
  const requirePath = (req, res) => {
    const path = param(req, 'path')
    if (!path) {
      send(res, 400, { error: 'missing path' })
      return null
    }
    return path
  }
  /** Resolve an absolute path for structural ops that must leave provider land. */
  const abs = (p) => (p.startsWith('/') || /^[A-Za-z]:[\\/]/.test(p)) ? p : join(process.cwd(), p)

  /**
   * `fs.resolve` may return a bare string OR a provider descriptor like
   * `{ targetKey, displayPath }`. Normalize to a real FS string for node:fs ops.
   */
  const resStr = async (p) => {
    let r
    try { r = await fs.resolve(p) } catch { return p }
    if (typeof r === 'string' && r) return r
    if (r && typeof r.targetKey === 'string' && r.targetKey) return r.targetKey
    if (r && typeof r.displayPath === 'string' && r.displayPath) return r.displayPath
    return p
  }
  const MIME = {
    '.html': 'text/html; charset=utf-8', '.htm': 'text/html; charset=utf-8',
    '.md': 'text/plain; charset=utf-8', '.svg': 'image/svg+xml',
    '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.gif': 'image/gif',
    '.webp': 'image/webp', '.bmp': 'image/bmp', '.ico': 'image/x-icon', '.avif': 'image/avif',
    '.pdf': 'application/pdf',
    '.mp4': 'video/mp4', '.webm': 'video/webm', '.mov': 'video/quicktime', '.mkv': 'video/x-matroska',
    '.mp3': 'audio/mpeg', '.wav': 'audio/wav', '.ogg': 'audio/ogg', '.flac': 'audio/flac', '.m4a': 'audio/mp4',
  }

  let registered = false
  const registerWeb = () => {
    if (registered) return
    const webServer = ctx.get('webServer') ?? ctx.get('httpServer')
    if (webServer === undefined) return
    registered = true

    const route = (path, handler) => {
      ctx.effect(() => webServer.register({ kind: 'exact', path, handler }), 'file-manager: ' + path)
    }

    // ---- Children tree: one directory level (files + dirs). ----
    route('/plugins/file-manager/list', async (req, res) => {
      const path = requirePath(req, res)
      if (path === null) return
      try {
        const target = await fs.resolve(path)
        const info = await fs.stat(target)
        if (info === undefined || info.type !== 'directory') {
          send(res, 404, { error: 'not-a-directory' })
          return
        }
        const entries = await fs.listDir(target)
        const rows = entries.map((e) => ({
          name: e.name,
          type: e.type, // 'file' | 'directory'
          size: typeof e.size === 'number' ? e.size : null,
          mtime: e.mtime != null ? Math.floor(Number(e.mtime)) : null,
          path: fs.processPath(e.target),
        })).sort((a, b) => {
          if (a.type !== b.type) return a.type === 'directory' ? -1 : 1
          return a.name.localeCompare(b.name)
        })
        const absolute = fs.resolve ? await fs.resolve(path) : target
        send(res, 200, { path, absolute, entries: rows })
      } catch (err) {
        send(res, 500, { error: message(err) })
      }
    })

    // ---- Recursive filename search (skips dense dirs, caps results). ----
    route('/plugins/file-manager/search', async (req, res) => {
      const root = param(req, 'root')
      const query = String(param(req, 'q') || '').toLowerCase().trim()
      if (!root || !query) {
        send(res, 200, { matches: [], truncated: false })
        return
      }
      try {
        const maxNodes = 5000
        const maxMatches = 400
        let nodes = 0
        const matches = []
        const stack = [root]
        let truncated = false
        while (stack.length > 0 && nodes < maxNodes && matches.length < maxMatches) {
          const dir = stack.pop()
          let target
          try { target = await fs.resolve(dir) } catch { continue }
          let entries
          try { entries = await fs.listDir(target) } catch { continue }
          nodes += entries.length
          for (const e of entries) {
            const p = fs.processPath(e.target)
            if (e.type === 'directory') {
              if (e.name === '.git' || e.name === 'node_modules' || e.name === 'dist' || e.name === '.dsh') continue
              stack.push(p)
              if (e.name.toLowerCase().includes(query)) matches.push({ name: e.name, path: p, type: 'directory', size: null })
            } else if (e.name.toLowerCase().includes(query)) {
              matches.push({ name: e.name, path: p, type: e.type, size: typeof e.size === 'number' ? e.size : null })
            }
          }
        }
        if (nodes >= maxNodes || matches.length >= maxMatches) truncated = true
        send(res, 200, { matches, truncated })
      } catch (err) {
        send(res, 500, { error: message(err) })
      }
    })

    // ---- Read a text file (with a size guard; no timeout by design). ----
    route('/plugins/file-manager/read', async (req, res) => {
      const path = requirePath(req, res)
      if (path === null) return
      try {
        const target = await fs.resolve(path)
        const info = await fs.stat(target)
        if (info === undefined) {
          send(res, 404, { error: 'not-found' })
          return
        }
        if (info.type !== 'file') {
          send(res, 400, { error: 'not-a-file' })
          return
        }
        const size = typeof info.size === 'number' ? info.size : 0
        if (size > MAX_READ) {
          send(res, 200, { tooLarge: true, size })
          return
        }
        const content = await fs.readText(target)
        send(res, 200, { content, size })
      } catch (err) {
        send(res, 500, { error: message(err) })
      }
    })

    // ---- Raw file streaming (bypasses the 1MB text cap). Used for pdf/html/image/video/audio preview. ----
    route('/plugins/file-manager/raw', async (req, res) => {
      if (req.method !== 'GET') { send(res, 405, { error: 'use GET' }); return }
      const path = requirePath(req, res)
      if (path === null) return
      try {
        const target = await resStr(path)
        const buffer = await nodeFs.readFile(target)
        const url = String(path || '')
        const extMatch = /(\.[^.\\/?]+)$/.exec(url.split('?')[0])
        const ext = extMatch ? extMatch[1].toLowerCase() : ''
        const type = MIME[ext] || 'application/octet-stream'
        res.writeHead(200, { 'content-type': type, 'cache-control': 'private, max-age=60', 'content-length': buffer.length })
        res.end(buffer)
      } catch (err) {
        try { send(res, 500, { error: message(err) }) } catch (e) {}
      }
    })

    // ---- Download a file (sets content-disposition attachment). ----
    route('/plugins/file-manager/download', async (req, res) => {
      if (req.method !== 'GET') { send(res, 405, { error: 'use GET' }); return }
      const path = requirePath(req, res)
      if (path === null) return
      try {
        const target = await resStr(path)
        const buffer = await nodeFs.readFile(target)
        const name = String(path || '').split('/').filter(Boolean).pop() || 'file'
        const url = String(path || '')
        const extMatch = /(\.[^.\\/?]+)$/.exec(url.split('?')[0])
        const ext = extMatch ? extMatch[1].toLowerCase() : ''
        const type = MIME[ext] || 'application/octet-stream'
        const safe = name.replace(/[\r\n"]/g, '')
        res.writeHead(200, {
          'content-type': type,
          'content-disposition': 'attachment; filename="' + safe + '"',
          'cache-control': 'no-store',
          'content-length': buffer.length,
        })
        res.end(buffer)
      } catch (err) {
        try { send(res, 500, { error: message(err) }) } catch (e) {}
      }
    })

    // ---- Write (create-or-replace) a file. ----
    route('/plugins/file-manager/write', async (req, res) => {
      if (req.method !== 'POST') {
        send(res, 405, { error: 'use POST' })
        return
      }
      let body
      try { body = JSON.parse(await readBody(req)) } catch { send(res, 400, { error: 'bad-json' }); return }
      const path = String((body && body.path) || '')
      if (!path) { send(res, 400, { error: 'missing path' }); return }
      try {
        const target = await fs.resolve(path)
        await fs.writeText(target, String((body && body.content) ?? ''))
        send(res, 200, { ok: true })
      } catch (err) { send(res, 500, { error: message(err) }) }
    })

    // ---- Rename / move a file or directory. ----
    route('/plugins/file-manager/rename', async (req, res) => {
      if (req.method !== 'POST') { send(res, 405, { error: 'use POST' }); return }
      let body
      try { body = JSON.parse(await readBody(req)) } catch { send(res, 400, { error: 'bad-json' }); return }
      const path = String((body && body.path) || '')
      const next = String((body && body.newPath) || '')
      if (!path || !next) { send(res, 400, { error: 'missing path/newPath' }); return }
      try {
        const src = abs(await resStr(path))
        const dst = abs(await resStr(next))
        await nodeFs.rename(src, dst)
        send(res, 200, { ok: true, path: next })
      } catch (err) { send(res, 500, { error: message(err) }) }
    })

    // ---- Delete a file or empty-ish directory tree. ----
    route('/plugins/file-manager/delete', async (req, res) => {
      if (req.method !== 'POST') { send(res, 405, { error: 'use POST' }); return }
      let body
      try { body = JSON.parse(await readBody(req)) } catch { send(res, 400, { error: 'bad-json' }); return }
      const path = String((body && body.path) || '')
      if (!path) { send(res, 400, { error: 'missing path' }); return }
      try {
        const target = abs(await resStr(path))
        await nodeFs.rm(target, { recursive: true, force: true })
        send(res, 200, { ok: true })
      } catch (err) { send(res, 500, { error: message(err) }) }
    })

    // ---- Create a directory. ----
    route('/plugins/file-manager/mkdir', async (req, res) => {
      if (req.method !== 'POST') { send(res, 405, { error: 'use POST' }); return }
      let body
      try { body = JSON.parse(await readBody(req)) } catch { send(res, 400, { error: 'bad-json' }); return }
      const path = String((body && body.path) || '')
      if (!path) { send(res, 400, { error: 'missing path' }); return }
      try {
        const target = abs(await resStr(path))
        await nodeFs.mkdir(target, { recursive: true })
        send(res, 200, { ok: true })
      } catch (err) { send(res, 500, { error: message(err) }) }
    })

    // ---- Create an empty file. ----
    route('/plugins/file-manager/touch', async (req, res) => {
      if (req.method !== 'POST') { send(res, 405, { error: 'use POST' }); return }
      let body
      try { body = JSON.parse(await readBody(req)) } catch { send(res, 400, { error: 'bad-json' }); return }
      const path = String((body && body.path) || '')
      if (!path) { send(res, 400, { error: 'missing path' }); return }
      try {
        const target = abs(await resStr(path))
        const handle = await nodeFs.open(target, 'a')
        await handle.close()
        send(res, 200, { ok: true })
      } catch (err) { send(res, 500, { error: message(err) }) }
    })

    // ---- Open a path with the OS default application (host.openPath RPC sibling). ----
    route('/plugins/file-manager/open', async (req, res) => {
      if (req.method !== 'POST') { send(res, 405, { error: 'use POST' }); return }
      let body
      try { body = JSON.parse(await readBody(req)) } catch { send(res, 400, { error: 'bad-json' }); return }
      const path = String((body && body.path) || '')
      if (!path) { send(res, 400, { error: 'missing path' }); return }
      try {
        const opened = await openViaHost(path)
        if (opened) { send(res, 200, { ok: true }); return }
        send(res, 200, { ok: false, error: 'no open capability mounted' })
      } catch (err) { send(res, 500, { ok: false, error: message(err) }) }
    })

    // ---- Open the parent directory in the OS file manager (reveal). ----
    route('/plugins/file-manager/reveal', async (req, res) => {
      if (req.method !== 'POST') { send(res, 405, { error: 'use POST' }); return }
      let body
      try { body = JSON.parse(await readBody(req)) } catch { send(res, 400, { error: 'bad-json' }); return }
      const path = String((body && body.path) || '')
      if (!path) { send(res, 400, { error: 'missing path' }); return }
      try {
        const opened = await openViaHost(dirname(path))
        if (opened) { send(res, 200, { ok: true }); return }
        send(res, 200, { ok: false, error: 'no open capability mounted' })
      } catch (err) { send(res, 500, { ok: false, error: message(err) }) }
    })

    // ---- Open the file in VS Code. ----
    route('/plugins/file-manager/open-vscode', async (req, res) => {
      if (req.method !== 'POST') { send(res, 405, { error: 'use POST' }); return }
      let body
      try { body = JSON.parse(await readBody(req)) } catch { send(res, 400, { error: 'bad-json' }); return }
      const path = String((body && body.path) || '')
      if (!path) { send(res, 400, { error: 'missing path' }); return }
      const shell = ctx.get('shell')
      const subprocess = ctx.get('subprocess')
      try {
        if (subprocess !== undefined) {
          let resolved = null
          try { resolved = await subprocess.resolveExecutable('code') } catch { /* not on PATH */ }
          let program = null
          if (resolved) {
            if (/\.(cmd|bat)$/i.test(String(resolved))) {
              const derived = String(resolved).replace(/[\\/]bin[\\/][^\\/]*$/i, '') + '\\Code.exe'
              try {
                const t = await fs.resolve(derived)
                const info = await fs.stat(t)
                if (info !== undefined && info.type === 'file') program = derived
              } catch { /* derived exe absent */ }
            } else {
              program = resolved
            }
          }
          if (program !== null) {
            const target = await resStr(path)
            const handle = subprocess.spawn({
              argv: [program, target],
              cwd: target,
              stdio: { stdin: 'ignore', stdout: { maxBytes: 4096 }, stderr: { maxBytes: 4096 } },
              graceMs: 8000,
            })
            const outcome = await handle.done
            send(res, 200, { ok: outcome.exitCode === 0, exitCode: outcome.exitCode })
            return
          }
        }
        if (shell !== undefined) {
          const target = await resStr(path)
          const quoted = '"' + String(target).replace(/"/g, '""') + '"'
          const command = 'Start-Process -FilePath code -ArgumentList ' + quoted
          const spec = shell.resolve({ command, timeoutMs: 10000 })
          const result = await shell.run(spec)
          if (result.exitCode === 0) { send(res, 200, { ok: true }); return }
        }
        send(res, 200, { ok: false, error: 'VS Code not found (code not on PATH)' })
      } catch (err) { send(res, 500, { ok: false, error: message(err) }) }
    })

    async function openViaHost(targetPath) {
      // Prefer the privileged host.openPath RPC (host-side Finder/Explorer hand-off).
      const api = ctx.get('apiProxy')
      if (api) {
        // Domain proxies expose `api.host.openPath(request, signal)`.
        const host = api.host
        const candidates = []
        if (typeof api.openPath === 'function') candidates.push({ fn: api.openPath, method: 'bare' })
        if (host && typeof host.openPath === 'function') candidates.push({ fn: host.openPath, method: 'host' })
        for (const c of candidates) {
          try {
            // RpcRequest<form>; fall back to a bare payload on transport mismatch.
            const req = { rpcId: 'fm-r1', payload: { path: targetPath } }
            const r = await c.fn(req, new AbortController().signal)
            if (r && (r.result?.ok || r.ok) === true) return true
            try {
              const r2 = await c.fn({ path: targetPath })
              if (r2 && (r2.result?.ok || r2.ok) === true) return true
            } catch { /* keep trying */ }
          } catch { /* try next candidate */ }
        }
      }
      // Bare fallback: platform-specific spawn (works in shells where openPath is absent).
      const sub = ctx.get('subprocess')
      if (sub) {
        try {
          const platform = process.platform
          const cmd = platform === 'darwin' ? ['open', targetPath]
            : platform === 'win32' ? ['cmd', '/c', 'start', '', targetPath]
            : ['xdg-open', targetPath]
          const h = sub.spawn({ argv: cmd, cwd: process.cwd(), stdio: 'ignore', graceMs: 4000 })
          const o = await h.done
          if (o && o.exitCode === 0) return true
        } catch { /* ignore */ }
      }
      return false
    }
  }

  registerWeb()
  ctx.on('internal/service', (name) => {
    if (name === 'webServer' || name === 'httpServer' || name === 'shell' || name === 'apiProxy') registerWeb()
  })
}