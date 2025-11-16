const { spawn } = require("child_process");
const path = require("path");
const fs = require("fs");

const workerPath = path.join(__dirname, "worker.js");
const DEFAULT_TIMEOUT = 5000;

function spawnWorker(action, timeoutMs = DEFAULT_TIMEOUT) {
  if (!action) {
    return Promise.reject(new Error("Action object is required"));
  }
  const input = JSON.stringify(action);
  const child = spawn(process.execPath, [workerPath, input], {
    cwd: __dirname,
    stdio: ["ignore", "pipe", "pipe"],
    windowsHide: true
  });

  let stdout = "";
  let stderr = "";
  let timedOut = false;
  const timer = setTimeout(() => {
    timedOut = true;
    child.kill();
  }, timeoutMs);

  child.stdout.on("data", (chunk) => {
    stdout += chunk.toString();
    process.stdout.write(chunk);
  });
  child.stderr.on("data", (chunk) => {
    stderr += chunk.toString();
    process.stderr.write(chunk);
  });

  return new Promise((resolve, reject) => {
    child.on("error", (err) => {
      clearTimeout(timer);
      reject(err);
    });
    child.on("close", (code, signal) => {
      clearTimeout(timer);
      if (timedOut) {
        return reject(new Error("Worker process timed out"));
      }
      let payload;
      try {
        const lines = stdout.trim().split(/\r?\n/);
        for (const line of lines) {
          if (!line.startsWith("{")) continue;
          const parsed = JSON.parse(line);
          if (parsed && parsed.method && parsed.success && parsed.result !== undefined) {
            payload = parsed.result;
          }
        }
      } catch (err) {
        console.warn("Failed to parse worker payload:", err.message);
      }
      resolve({ code, signal, stdout, stderr, payload });
    });
  });
}

function runTestSuite(timeoutMs = 15000) {
  const script = path.join(__dirname, "test", "run-tests.js");
  if (!fs.existsSync(script)) {
    return Promise.reject(new Error(`Test script missing: ${script}`));
  }
  const child = spawn(process.execPath, [script], {
    cwd: __dirname,
    stdio: ["ignore", "pipe", "pipe"],
    windowsHide: true
  });

  let stdout = "";
  let stderr = "";
  let timedOut = false;
  const timer = setTimeout(() => {
    timedOut = true;
    child.kill();
  }, timeoutMs);

  child.stdout.on("data", (chunk) => {
    stdout += chunk.toString();
    process.stdout.write(chunk);
  });
  child.stderr.on("data", (chunk) => {
    stderr += chunk.toString();
    process.stderr.write(chunk);
  });

  return new Promise((resolve, reject) => {
    child.on("error", (err) => {
      clearTimeout(timer);
      reject(err);
    });
    child.on("close", (code, signal) => {
      clearTimeout(timer);
      if (timedOut) {
        reject(new Error("Test suite timed out"));
        return;
      }
      resolve({ code, signal, stdout, stderr });
    });
  });
}

if (require.main === module) {
  const actionArg = process.argv[2];
  if (!actionArg) {
    console.error("[Supervisor] Action JSON missing");
    process.exit(1);
  }
  let action;
  let raw = actionArg;
  if (raw.startsWith("@")) {
    const filePath = raw.slice(1);
    if (!require("fs").existsSync(filePath)) {
      console.error("[Supervisor] Action file missing:", filePath);
      process.exit(1);
    }
    raw = require("fs").readFileSync(filePath, "utf8");
  }
  try {
    action = JSON.parse(raw);
  } catch (err) {
    console.error("[Supervisor] Failed to parse action JSON", err.message);
    process.exit(1);
  }

  if (action.method === "RunTests") {
    runTestSuite()
      .then(({ code }) => {
        console.log(`[Supervisor] Test suite exited with code ${code}`);
      })
      .catch((err) => {
        console.error("[Supervisor] Test suite failed:", err);
        process.exit(2);
      });
    return;
  }

  spawnWorker(action)
    .then(({ code }) => {
      console.log(`[Supervisor] Worker exited with code ${code}`);
    })
    .catch((err) => {
      console.error("[Supervisor] Worker failed:", err);
      process.exit(2);
    });
}

module.exports = { spawnWorker };
