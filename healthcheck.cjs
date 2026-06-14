"use strict";

const http = require("http");

const appPort = Number(process.env.PORT || 8080);

function probe(port, cb) {
  const req = http.request(
    {
      hostname: "127.0.0.1",
      port,
      path: "/health",
      method: "GET",
      timeout: 3000,
    },
    (res) => {
      res.resume();
      cb(res.statusCode >= 200 && res.statusCode < 300);
    }
  );
  req.on("error", () => cb(false));
  req.on("timeout", () => {
    req.destroy();
    cb(false);
  });
  req.end();
}

probe(appPort, (ok) => {
  if (ok) {
    process.exit(0);
  }
  probe(80, (okOn80) => {
    process.exit(okOn80 ? 0 : 1);
  });
});
