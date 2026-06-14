"use strict";

const http = require("http");

const port = Number(process.env.PORT || 8080);

const req = http.request(
  {
    hostname: "127.0.0.1",
    port,
    path: "/health",
    method: "GET",
    timeout: 4000,
  },
  (res) => {
    res.resume();
    const ok = res.statusCode >= 200 && res.statusCode < 300;
    process.exit(ok ? 0 : 1);
  }
);

req.on("error", () => process.exit(1));
req.on("timeout", () => {
  req.destroy();
  process.exit(1);
});

req.end();
