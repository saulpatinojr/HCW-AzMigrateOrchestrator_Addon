// Serves tests/e2e/host-page.html on 18081: the stand-in for the hybridcloudworks.com page that frames the pane.
import { createServer } from "node:http";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
const page = readFileSync(fileURLToPath(new URL("./host-page.html", import.meta.url)));
const port = Number(process.env.PORT ?? 18081);
createServer((_req, res) => {
  res.writeHead(200, { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" });
  res.end(page);
}).listen(port, "127.0.0.1", () => process.stderr.write(`host page on ${port}\n`));
