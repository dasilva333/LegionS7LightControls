const express = require("express");
const fs = require("fs");
const path = require("path");

const app = express();
app.use(express.json());

// --- THE ONLY ADDITION ---
// Initialize the Frida proxy, which will spawn the worker process in the background.
console.log('[Server] Initializing Frida proxy...');
require('./frida/proxy.js');
// -------------------------

const apiDir = path.join(__dirname, "api");

function registerRoutes(directory) {
  fs.readdirSync(directory, { withFileTypes: true }).forEach((entry) => {
    const fullPath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      registerRoutes(fullPath);
      return;
    }
    if (!entry.name.endsWith(".js")) return;
    try {
      const routeModule = require(fullPath);
      if (!routeModule || !routeModule.method || !routeModule.route || typeof routeModule.handler !== "function") {
        console.warn(`[API] Skipping ${fullPath}: missing contract {method, route, handler}`);
        return;
      }
      const method = routeModule.method.toLowerCase();
      if (typeof app[method] !== "function") {
        console.warn(`[API] Skipping ${fullPath}: Express does not support method ${routeModule.method}`);
        return;
      }
      app[method](routeModule.route, routeModule.handler);
      console.log(`[API] Registered ${routeModule.method.toUpperCase()} ${routeModule.route}`);
    } catch (error) {
      console.error(`[API] Failed to load ${fullPath}:`, error);
    }
  });
}

if (fs.existsSync(apiDir)) {
  registerRoutes(apiDir);
} else {
  console.warn("API directory not found; no routes loaded");
}

app.get("/health", (_req, res) => res.json({ status: "ok" }));

const port = process.env.PORT || 3005;
app.listen(port, () => {
  console.log(`Lighting automation backend listening on port ${port}`);
});

module.exports = app;