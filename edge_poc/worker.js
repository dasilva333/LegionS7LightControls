const edge = require("edge-js");
const path = require("path");

const assemblyPath = path.join(__dirname, "EdgeWrapper", "bin", "Debug", "net48", "EdgeWrapper.dll");

const getProfileId = edge.func({
  assemblyFile: assemblyPath,
  typeName: "EdgeWrapper.ProfileService",
  methodName: "GetActiveProfileId"
});

const shutdownBridge = edge.func({
  assemblyFile: assemblyPath,
  typeName: "EdgeWrapper.ProfileService",
  methodName: "ShutdownBridge"
});

getProfileId(null, (error, result) => {
  if (error) {
    console.error("Edge call failed:", error);
    process.exit(1);
    return;
  }
  console.log("Active profile id:", result);
  console.log("Calling shutdown hook...");
  shutdownBridge(null, (shutdownError) => {
    if (shutdownError) {
      console.error("Shutdown failed:", shutdownError);
      process.exit(1);
      return;
    }
    console.log("Shutdown complete.");
    process.exit(0);
  });
});
