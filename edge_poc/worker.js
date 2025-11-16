const edge = require("edge-js");
const path = require("path");

const assemblyPath = path.join(__dirname, "EdgeWrapper", "bin", "Debug", "net48", "EdgeWrapper.dll");

const getProfileId = edge.func({
  assemblyFile: assemblyPath,
  typeName: "EdgeWrapper.ProfileService",
  methodName: "GetActiveProfileId"
});

getProfileId(null, (error, result) => {
  if (error) {
    console.error("Edge call failed:", error);
    process.exit(1);
    return;
  }
  console.log("Active profile id:", result);
  process.exit(0);
});
