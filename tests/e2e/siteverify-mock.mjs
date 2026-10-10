// Stand-in for the human-verification siteverify endpoint (AMO_TURNSTILE_SITEVERIFY_URL in playwright.config.ts).
// Success iff the widget token is exactly "e2e-token"; anything else reports invalid-input-response.
import { createServer } from "node:http";
const port = Number(process.env.PORT ?? 18090);
createServer((req, res) => {
  let body = "";
  req.on("data", (c) => (body += c));
  req.on("end", () => {
    const token = new URLSearchParams(body).get("response");
    const success = req.method === "POST" && req.url === "/siteverify" && token === "e2e-token";
    res.writeHead(200, { "content-type": "application/json" });
    res.end(JSON.stringify(success ? { success: true } : { success: false, "error-codes": ["invalid-input-response"] }));
  });
}).listen(port, "127.0.0.1", () => process.stderr.write(`siteverify mock on ${port}\n`));
