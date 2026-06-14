"use strict";

const http = require("http");

const port = Number(process.env.PORT || 8080);

function earlyHandler(req, res) {
  const path = (req.url || "/").split("?")[0];
  const method = req.method || "GET";

  if (path === "/health" || path === "/") {
    res.writeHead(200, {
      "Content-Type": "text/plain",
      Connection: "close",
    });
    if (method === "HEAD") {
      res.end();
      return;
    }
    res.end("ok");
    return;
  }

  res.writeHead(503, { "Content-Type": "text/plain", Connection: "close" });
  res.end("starting");
}

global.__fgServeRequest = earlyHandler;

const server = http.createServer((req, res) => {
  global.__fgServeRequest(req, res);
});

server.on("error", (err) => {
  console.error("[preload] listen error:", err);
  process.exit(1);
});

server.listen({ port, host: "::", ipv6Only: false }, () => {
  console.log(`[preload] port open on [::]:${port} (dual-stack)`);

  process.env.FG_PRELOAD = "1";

  const { attachApplication } = require("../server-dist/server/index.js");
  attachApplication(server).catch((err) => {
    console.error("[preload] boot failed:", err);
    process.exit(1);
  });
});
