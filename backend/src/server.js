const http = require("http");

const PORT = Number(process.env.PORT || 5000);
const ML_SERVICE_URL = process.env.ML_SERVICE_URL || "http://localhost:8000";

function sendJson(res, statusCode, payload) {
  res.writeHead(statusCode, { "Content-Type": "application/json" });
  res.end(JSON.stringify(payload));
}

function readJsonBody(req) {
  return new Promise((resolve, reject) => {
    let body = "";

    req.on("data", (chunk) => {
      body += chunk;
    });

    req.on("end", () => {
      if (!body) {
        resolve({});
        return;
      }

      try {
        resolve(JSON.parse(body));
      } catch {
        reject(new Error("Invalid JSON body"));
      }
    });

    req.on("error", reject);
  });
}

async function proxyToMlService(path, payload) {
  const response = await fetch(`${ML_SERVICE_URL}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  const text = await response.text();
  let data;

  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    data = { detail: text || "Invalid response from ML service" };
  }

  return { ok: response.ok, status: response.status, data };
}

const server = http.createServer(async (req, res) => {
  if (req.method === "GET" && req.url === "/") {
    sendJson(res, 200, { status: "ok", service: "backend" });
    return;
  }

  if (req.method === "GET" && req.url === "/health") {
    sendJson(res, 200, { status: "ok", service: "backend", mlServiceUrl: ML_SERVICE_URL });
    return;
  }

  if (req.method === "GET" && req.url === "/health/ml") {
    try {
      const response = await fetch(`${ML_SERVICE_URL}/health`);
      const data = await response.json();
      sendJson(res, response.status, data);
    } catch (error) {
      sendJson(res, 502, {
        error: "ML service unavailable",
        detail: error.message,
      });
    }
    return;
  }

  if (req.method === "POST" && (req.url === "/embed/text" || req.url === "/embed/video")) {
    try {
      const payload = await readJsonBody(req);
      const result = await proxyToMlService(req.url, payload);
      sendJson(res, result.status, result.data);
    } catch (error) {
      const statusCode = error.message === "Invalid JSON body" ? 400 : 502;
      sendJson(res, statusCode, {
        error: statusCode === 400 ? "Bad request" : "ML proxy failed",
        detail: error.message,
      });
    }
    return;
  }

  sendJson(res, 404, { error: "Not found" });
});

server.listen(PORT, () => {
  console.log(`Backend listening on port ${PORT}`);
  console.log(`Proxying ML requests to ${ML_SERVICE_URL}`);
});
