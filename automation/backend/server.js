require("dotenv").config();
const express = require("express");
const fs = require("fs");
const path = require("path");
const cors = require("cors");

const app = express();
app.use(express.json());
app.use(cors({
  storedCredentials: false,
  credentials: false,
  origin: "*"
}));

// --- THE DAEMON ADDITIONs ---
console.log('[Server] Initializing Frida proxy...');
require('./frida/proxy.js');
require('./daemons/godModeDirector');
require('./daemons/weatherMonitor');
require("./daemons/typingMonitor");
require('./daemons/processMonitor');
require('./daemons/audioMonitor');
require('./daemons/timeKeeper');
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
      if (typeof routeModule === "function") {
        app.use(routeModule);
        console.log(`[API] Mounted router from ${fullPath}`);
        return;
      }
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

const http = require('http');
const { Server } = require("socket.io");
const { initSnakeSocket } = require('./socket/snakeHandler');

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

// Initialize Snake Socket Handler
initSnakeSocket(io);

const rawPort = process.env.PORT || process.argv[2] || 3005;
const port = Number(rawPort) || 3005;
server.listen(port, () => {
  console.log(`Lighting automation backend listening on port ${port}`);
});

module.exports = app;
