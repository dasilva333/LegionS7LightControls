const { spawn } = require("child_process");
const path = require("path");

const workerPath = path.join(__dirname, "worker.js");
const child = spawn(process.execPath, [workerPath], { stdio: ["ignore", "pipe", "inherit"] });

let sawOutput = false;
let graceTimer = null;
let graceKill = false;

console.log("[Supervisor] spawned worker:", workerPath);

child.stdout.on("data", (chunk) => {
  process.stdout.write(chunk);
  if (!sawOutput) {
    sawOutput = true;
    console.log("[Supervisor] worker emitted output; starting grace timer");
    graceTimer = setTimeout(() => {
      if (!child.killed) {
        console.log("[Supervisor] grace timeout reached, closing gently");
        graceKill = true;
      }
    }, 5000);
  }
});

const hardTimeout = setTimeout(() => {
  if (!child.killed) {
    console.log("[Supervisor] hard timeout reached, stopping the worker");
    graceKill = true;
  }
}, 20000);

child.on("exit", (code, signal) => {
  clearTimeout(hardTimeout);
  if (graceTimer) {
    clearTimeout(graceTimer);
    console.log("[Supervisor] cleared grace timer");
    if (graceKill) {
      console.log("[Supervisor] worker reached grace/hard timeout");
    }
  }
  if (signal) {
    console.error(`[Supervisor] worker terminated by signal ${signal}`);
    process.exit(1);
  } else {
    console.log(`[Supervisor] worker exited with code ${code}`);
    process.exit(code ?? 0);
  }
});
