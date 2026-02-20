const fs = require('fs');
const path = require('path');

const frontendRoot = path.resolve(__dirname, '..');
const buildDir = path.join(frontendRoot, 'build');
const backendDist = path.resolve(frontendRoot, '..', 'backend', 'dist');

if (!fs.existsSync(buildDir)) {
  console.error(`[copy-dist] Build folder not found: ${buildDir}`);
  process.exit(1);
}

// Remove existing dist
if (fs.existsSync(backendDist)) {
  fs.rmSync(backendDist, { recursive: true, force: true });
}

// Copy build -> backend/dist
fs.cpSync(buildDir, backendDist, { recursive: true });
console.log(`[copy-dist] Copied ${buildDir} -> ${backendDist}`);
