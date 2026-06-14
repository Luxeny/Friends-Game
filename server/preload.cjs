"use strict";

const http = require("http");

const appPort = Number(process.env.PORT || 8080);

function isHealthPath(pathname) {
  return (
    pathname === "/health" ||
    pathname === "/health/" ||
    pathname === "/ping" ||
    pathname === "/"
  );
}

function healthHandler(req, res) {
  const path = (req.url || "/").split("?")[0];
  const method = req.method || "GET";

  if (isHealthPath(path)) {
    console.log(
      `[health] ${method} ${path} from ${req.socket.remoteAddress || "?"}`
    );
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

function startHealthOnlyServer(port, label) {
  const server = http.createServer(healthHandler);
  server.on("error", (err) => {
    console.error(`[preload] ${label} listen error:`, err);
  });
  server.listen(port, "0.0.0.0", () => {
    console.log(`[preload] ${label} listening on 0.0.0.0:${port}`);
  });
  return server;
}

global.__fgServeRequest = healthHandler;

const server = http.createServer((req, res) => {
  global.__fgServeRequest(req, res);
});

server.on("error", (err) => {
  console.error("[preload] app listen error:", err);
  process.exit(1);
});

server.listen(appPort, "0.0.0.0", () => {
  console.log(`[preload] app listening on 0.0.0.0:${appPort}`);

  if (appPort !== 80) {
    startHealthOnlyServer(80, "health-probe");
  }

  process.env.FG_PRELOAD = "1";

  const { attachApplication } = require("../server-dist/server/index.js");
  attachApplication(server).catch((err) => {
    console.error("[preload] boot failed:", err);
    process.exit(1);
  });
});
