// Servidor exclusivamente de testes: os dois artefatos finais, sem Vite dev.
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { resolve, extname, sep } from "node:path";
import { URL } from "node:url";

const mime = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".json": "application/json", ".geojson": "application/geo+json", ".svg": "image/svg+xml", ".png": "image/png", ".ico": "image/x-icon" };
for (const [port, directory] of [[5183, "dist/prod-mock"], [5184, "dist"]]) {
  const root = resolve(directory);
  createServer(async (request, response) => {
    try {
      const pathname = decodeURIComponent(new URL(request.url, "http://localhost").pathname);
      const filename = resolve(root, `.${pathname}`);
      if (filename !== root && !filename.startsWith(root + sep)) {
        response.writeHead(403).end(); return;
      }
      if (/^\/(api|actuator)(\/|$)/.test(pathname)) {
        response.writeHead(404).end(); return;
      }
      let body, extension;
      try { body = await readFile(filename); extension = extname(filename); }
      catch { body = await readFile(resolve(root, "index.html")); extension = ".html"; }
      response.writeHead(200, { "Content-Type": mime[extension] || "application/octet-stream", "Cache-Control": "no-store" }).end(body);
    } catch { response.writeHead(500).end(); }
  }).listen(port, "127.0.0.1");
}
