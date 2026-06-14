"use strict";

const http = require("http");

const appPort = Number(process.env.PORT || 8080);

function respondOk(req, res, label) {
  const path = (req.url || "/").split("?")[0];
  const method = req.method || "GET";

  console.log(
    `[health${label}] ${method} ${path} from ${req.socket.remoteAddress || "?"}`
  );

  const body = method === "HEAD" ? undefined : "ok";
  const headers = {
    "Content-Type": "text/plain",
    Connection: "close",
  };
  if (method === "HEAD") {
    headers["Content-Length"] = "0";
  } else {
    headers["Content-Length"] = "2";
  }

  res.writeHead(200, headers);
  res.end(body);
}

function platformHealthHandler(req, res) {
  const path = (req.url || "/").split("?")[0];

  if (
    path === "/health" ||
    path === "/health/" ||
    path === "/ping" ||
    path === "/"
  ) {
    respondOk(req, res, ":80");
    return;
  }

  res.writeHead(404, { "Content-Type": "text/plain", Connection: "close" });
  res.end("not found");
}

function appHealthHandler(req, res) {
  const path = (req.url || "/").split("?")[0];
  const method = req.method || "GET";

  if (
    path === "/health" ||
    path === "/health/" ||
    path === "/ping"
  ) {
    respondOk(req, res, "");
    return;
  }

  if (path === "/") {
    const accept = req.headers.accept ?? "";
    const ua = (req.headers["user-agent"] ?? "").toLowerCase();
    const isProbe =
      method === "HEAD" ||
      !accept.includes("text/html") ||
      !ua ||
      ua.includes("curl") ||
      ua.includes("wget") ||
      ua.includes("go-http-client") ||
      ua.includes("health");

    if (isProbe) {
      respondOk(req, res, "");
      return;
    }
  }

  res.writeHead(503, { "Content-Type": "text/plain", Connection: "close" });
  res.end("starting");
}

if (appPort !== 80) {
  const platformServer = http.createServer(platformHealthHandler);
  platformServer.on("error", (err) => {
    console.error("[preload] platform health listen error:", err);
  });
  platformServer.listen(80, "0.0.0.0", () => {
    console.log("[preload] platform health listening on 0.0.0.0:80");
  });
}

global.__fgServeRequest = appHealthHandler;

const server = http.createServer((req, res) => {
  global.__fgServeRequest(req, res);
});

server.on("error", (err) => {
  console.error("[preload] app listen error:", err);
  process.exit(1);
});

server.listen(appPort, "0.0.0.0", () => {
  console.log(`[preload] app listening on 0.0.0.0:${appPort}`);

  process.env.FG_PRELOAD = "1";

  const { attachApplication } = require("../server-dist/server/index.js");
  attachApplication(server).catch((err) => {
    console.error("[preload] boot failed:", err);
    process.exit(1);
  });
});
