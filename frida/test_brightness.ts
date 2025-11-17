// THE FIX: Use the CommonJS 'require' syntax.
// Since we downgraded to frida@15 (a CJS package), and our tsconfig is set to "module": "CommonJS",
// this is the most direct and reliable way to import it. TypeScript's "esModuleInterop"
// will make this work correctly with the type definitions.
import frida = require('frida');

import fs from 'fs/promises';
import path from 'path';

// --- Configuration ---
const TARGET_PROCESS = 'LenovoVantage-(LenovoGamingUserAddin).exe';
const AGENT_SCRIPT_PATH = path.join(__dirname, 'frida_agent.js');

interface BrightnessAgent {
  getBrightness(): Promise<number>;
}

async function main(): Promise<void> {
  console.log(`--- Frida RPC TypeScript Client ---`);
  console.log(`Targeting process: ${TARGET_PROCESS}`);

  let session: frida.Session | null = null;
  let script: frida.Script | null = null;

  try {
    // --- 1. Attach to the running process ---
    console.log('\n[1/4] Attaching to process...');
    const device = await frida.getLocalDevice();
    const processes = await device.enumerateProcesses();
    const process = processes.find((p) => p.name === TARGET_PROCESS);

    if (!process) {
      throw new Error(`Process "${TARGET_PROCESS}" not found. Is Lenovo Vantage running?`);
    }

    session = await device.attach(process.pid);
    console.log('  -> Attached successfully.');

    // --- 2. Load the agent script from disk ---
    console.log('\n[2/4] Loading agent script...');
    const agentCode = await fs.readFile(AGENT_SCRIPT_PATH, 'utf8');
    console.log(`  -> Script loaded (${agentCode.length} bytes).`);

    // --- 3. Inject the agent script ---
    console.log('\n[3/4] Injecting script into target process...');
    script = await session.createScript(agentCode);

    script.message.connect((message, data) => {
      if (message.type === 'send') {
        console.log('[Agent Log]', message.payload);
      } else if (message.type === 'error') {
        console.error('[Agent Error]', message.stack);
      }
    });

    await script.load();
    console.log('  -> Script injected and loaded.');

    const agentApi = script.exports as unknown as BrightnessAgent;

    console.log('\n[4/4] Calling RPC function: getBrightness()');
    const brightness = await agentApi.getBrightness();

    console.log('\n--- RESULT ---');
    console.log(`Brightness level received from agent: ${brightness}`);
    console.log('--- SUCCESS ---');

  } catch (error) {
    console.error('\n--- FATAL ERROR ---');
    if (error instanceof Error) {
        console.error(`Error Message: ${error.message}`);
    } else {
        console.error(error);
    }
  } finally {
    // --- Clean up ---
    if (script) {
      console.log('\nUnloading script...');
      await script.unload();
    }
    if (session) {
      console.log('Detaching from process...');
      await session.detach();
    }
    console.log('--- Client finished ---');
  }
}

main().catch(err => {
    console.error("Unhandled promise rejection in main:", err);
});