const { spawn } = require("child_process");
const path = require("path");

const workerPath = path.join(__dirname, "worker.js");
const child = spawn(process.execPath, [workerPath], { stdio: ["ignore", "pipe", "inherit"] });

let sawOutput = false;
let graceTimer = null;

child.stdout.on("data", (chunk) => {
  process.stdout.write(chunk);
  if (!sawOutput) {
    sawOutput = true;
    graceTimer = setTimeout(() => {
      child.kill("SIGKILL");
    }, 500);
  }
});

const hardTimeout = setTimeout(() => {
  child.kill("SIGKILL");
}, 10000);

child.on("exit", (code, signal) => {
  clearTimeout(hardTimeout);
  if (graceTimer) clearTimeout(graceTimer);
  process.exit(signal ? 0 : (code ?? 0));
});
