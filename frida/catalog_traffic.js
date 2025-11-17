const fs = require("fs");
const path = require("path");

function getTrafficDir() {
  const provided = process.env.TRAFFIC_DIR;
  if (provided && provided.length > 0) return provided;
  const localApp = process.env.LOCALAPPDATA;
  if (!localApp) throw new Error("LOCALAPPDATA not set");
  return path.join(localApp, "Temp", "traffic");
}

function readJson(filePath) {
  try {
    const raw = fs.readFileSync(filePath, "utf8");
    return JSON.parse(raw);
  } catch (err) {
    return null;
  }
}

function parseInner(jsonStr) {
  if (!jsonStr) return null;
  try {
    return JSON.parse(jsonStr);
  } catch (_) {
    return null;
  }
}

function updateLengthStats(statsObj, len) {
  statsObj.count++;
  statsObj.total += len;
  if (len < statsObj.min) statsObj.min = len;
  if (len > statsObj.max) statsObj.max = len;
}

function formatTable(rows) {
  if (!rows.length) return "(none)";
  return ["| Item | Count |", "| --- | --- |", ...rows.map(r => `| ${r[0]} | ${r[1]} |`)].join("\n");
}

(() => {
  const trafficDir = getTrafficDir();
  const files = fs.readdirSync(trafficDir);
  const report = {
    commands: { count: 0, contracts: new Map(), commands: new Map(), clientIds: new Set() },
    payloads: { stats: { count: 0, total: 0, min: Infinity, max: 0 } },
    contexts: { count: 0, nonNull: [] },
    outbound: { count: 0, errorCodes: new Map(), commands: new Map() }
  };

  for (const file of files) {
    if (!file.endsWith(".json")) continue;
    const full = path.join(trafficDir, file);
    const data = readJson(full);
    if (!data) continue;

    if (file.startsWith("inbound_command_")) {
      report.commands.count++;
      const inner = parseInner(data.string_content);
      if (inner) {
        if (inner.contract) {
          report.commands.contracts.set(inner.contract, (report.commands.contracts.get(inner.contract) || 0) + 1);
        }
        if (inner.command) {
          report.commands.commands.set(inner.command, (report.commands.commands.get(inner.command) || 0) + 1);
        }
        if (inner.clientId) report.commands.clientIds.add(inner.clientId);
      }
    } else if (file.startsWith("inbound_payload_")) {
      const str = data.string_content || "";
      updateLengthStats(report.payloads.stats, str.length);
    } else if (file.startsWith("inbound_context_")) {
      report.contexts.count++;
      if (data.object_pointer && data.object_pointer !== "0x0") {
        report.contexts.nonNull.push({ timestamp: data.timestamp, pointer: data.object_pointer, length: data.length || 0 });
      }
    } else if (file.startsWith("outbound_result_")) {
      report.outbound.count++;
      if (typeof data.errorcode !== "undefined") {
        report.outbound.errorCodes.set(data.errorcode, (report.outbound.errorCodes.get(data.errorcode) || 0) + 1);
      }
      if (data.payload) {
        const inner = parseInner(data.payload);
        if (Array.isArray(inner?.SettingList)) {
          for (const entry of inner.SettingList) {
            if (entry?.key === "Command" && entry.Value) {
              report.outbound.commands.set(entry.Value, (report.outbound.commands.get(entry.Value) || 0) + 1);
            }
          }
        }
      }
    }
  }

  if (report.payloads.stats.count === 0) report.payloads.stats.min = 0;

  const lines = [];
  lines.push(`# Traffic Report`);
  lines.push(`Generated: ${new Date().toISOString()}`);
  lines.push(`Source: ${trafficDir}`);
  lines.push("");

  lines.push("## Command Files");
  lines.push(`Total command JSON files: ${report.commands.count}`);
  lines.push(`Unique contracts (${report.commands.contracts.size}): ${Array.from(report.commands.contracts.keys()).join(", ") || "none"}`);
  lines.push(`Unique clientIds (${report.commands.clientIds.size}): ${Array.from(report.commands.clientIds).join(", ") || "none"}`);
  lines.push("");
  lines.push("Top commands:");
  const cmdRows = Array.from(report.commands.commands.entries()).sort((a,b)=>b[1]-a[1]);
  lines.push(formatTable(cmdRows));
  lines.push("");

  lines.push("## Payload Files");
  const p = report.payloads.stats;
  lines.push(`Total payload JSON files: ${p.count}`);
  if (p.count > 0) {
    lines.push(`Average payload length: ${(p.total / p.count).toFixed(2)}`);
    lines.push(`Min length: ${p.min}, Max length: ${p.max}`);
  }
  lines.push("");

  lines.push("## Context Files");
  lines.push(`Total context JSON files: ${report.contexts.count}`);
  lines.push(`Non-null contexts: ${report.contexts.nonNull.length}`);
  if (report.contexts.nonNull.length) {
    lines.push("| Timestamp | Pointer | Declared Length |");
    lines.push("| --- | --- | --- |");
    for (const entry of report.contexts.nonNull) {
      lines.push(`| ${entry.timestamp} | ${entry.pointer} | ${entry.length} |`);
    }
  }
  lines.push("");

  lines.push("## Outbound Results");
  lines.push(`Total outbound JSON files: ${report.outbound.count}`);
  lines.push("Error codes:");
  const errRows = Array.from(report.outbound.errorCodes.entries()).sort((a,b)=>b[1]-a[1]);
  lines.push(formatTable(errRows));
  lines.push("");
  lines.push("Commands observed in SettingList:");
  const outCmdRows = Array.from(report.outbound.commands.entries()).sort((a,b)=>b[1]-a[1]);
  lines.push(formatTable(outCmdRows));

  fs.writeFileSync(path.join(process.cwd(), "traffic_report.md"), lines.join("\n"));
  console.log("Traffic report written to", path.join(process.cwd(), "traffic_report.md"));
})();
