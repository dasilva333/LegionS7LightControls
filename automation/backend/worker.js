const edge = require("edge-js");
const path = require("path");
const fs = require("fs");

const assemblyPath = path.join(__dirname, "..", "edge_bridge", "EdgeWrapper", "bin", "Debug", "net48", "EdgeWrapper.dll");
if (!fs.existsSync(assemblyPath)) {
  console.error("EdgeWrapper assembly missing at", assemblyPath);
  process.exit(1);
}

const methods = {
  GetActiveProfileId: edge.func({ assemblyFile: assemblyPath, typeName: "EdgeWrapper.ProfileService", methodName: "GetActiveProfileId" }),
  GetBrightness: edge.func({ assemblyFile: assemblyPath, typeName: "EdgeWrapper.ProfileService", methodName: "GetBrightness" }),
  GetProfileJson: edge.func({ assemblyFile: assemblyPath, typeName: "EdgeWrapper.ProfileService", methodName: "GetProfileJson" }),
  SetProfileDetails: edge.func({ assemblyFile: assemblyPath, typeName: "EdgeWrapper.ProfileService", methodName: "SetProfileDetails" }),
  SetProfileIndex: edge.func({ assemblyFile: assemblyPath, typeName: "EdgeWrapper.ProfileService", methodName: "SetProfileIndex" }),
  ShutdownBridge: edge.func({ assemblyFile: assemblyPath, typeName: "EdgeWrapper.ProfileService", methodName: "ShutdownBridge" })
};

function callMethod(name, payload) {
  const fn = methods[name];
  if (!fn) {
    return Promise.reject(new Error(`Unknown method: ${name}`));
  }
  return new Promise((resolve, reject) => {
    fn(payload, (error, result) => {
      if (error) return reject(error);
      resolve(result);
    });
  });
}

async function main() {
  let arg = process.argv[2];
  if (!arg) {
    console.error("[Worker] Missing action argument (JSON)");
    process.exit(1);
  }

  if (arg.startsWith("@")) {
    const filePath = arg.slice(1);
    if (!fs.existsSync(filePath)) {
      console.error("[Worker] Action file missing:", filePath);
      process.exit(1);
    }
    arg = fs.readFileSync(filePath, "utf8");
  }

  let action;
  try {
    action = JSON.parse(arg);
  } catch (err) {
    console.error("[Worker] Failed to parse action:", err.message);
    process.exit(1);
  }

  const method = action.method;
  if (!method) {
    console.error("[Worker] Action must include 'method'");
    process.exit(1);
  }

  let payload = action.payload;
  if (action.profileId !== undefined) payload = action.profileId;

  console.log(`[Worker] Invoking ${method}`);

  let exitCode = 0;
  try {
    const result = await callMethod(method, payload);
    console.log(`[Worker] ${method} result:`, result);
    console.log(JSON.stringify({ method, success: true, result }));
  } catch (error) {
    exitCode = 2;
    console.error(`[Worker] ${method} failed:`, error);
    console.log(JSON.stringify({ method, success: false, error: error.message }));
  } finally {
    callMethod("ShutdownBridge", null)
      .then(() => {
        console.log("[Worker] ShutdownBridge completed");
      })
      .catch((err) => {
        console.error("[Worker] ShutdownBridge failed:", err);
      })
      .finally(() => process.exit(exitCode));
  }
}

main();
