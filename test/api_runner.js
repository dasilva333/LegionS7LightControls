const { spawn } = require('child_process');
const path = require('path');

const targetUrl = process.argv[2];
const method = process.argv[3] || 'GET';
const body = process.argv[4] ? JSON.stringify(JSON.parse(process.argv[4])) : null;

if (!targetUrl) {
  console.error('Usage: node test/api_runner.js <URL> [METHOD] [BODY_JSON]');
  process.exit(1);
}

const TEST_PORT = 4000 + Math.floor(Math.random() * 1000);
const baseUrl = new URL(targetUrl);
const requestPath = `${baseUrl.pathname}${baseUrl.search}`;
const fetchUrl = `${baseUrl.protocol || 'http:'}//localhost:${TEST_PORT}${requestPath}`;

console.log(`[TestRunner] Starting server on port ${TEST_PORT}...`);
const server = spawn('node', ['server.js', String(TEST_PORT)], {
  cwd: path.join(__dirname, '../automation/backend'),
  shell: true,
  stdio: 'pipe'
});

const killServer = () => {
  if (server?.pid) {
    console.log(`[TestRunner] Killing server (PID: ${server.pid})...`);
    spawn('taskkill', ['/pid', server.pid, '/f', '/t']);
  }
};

setTimeout(async () => {
  console.log(`[TestRunner] Fetching: ${fetchUrl}`);
  try {
    const options = {
      method,
      headers: { 'Content-Type': 'application/json' }
    };
    if (body) {
      options.body = body;
    }

    const response = await fetch(fetchUrl, options);
    const json = await response.json();

    console.log('--- RESPONSE ---');
    console.log(JSON.stringify(json, null, 2));
    console.log('----------------');
  } catch (error) {
    console.error('[TestRunner] Error:', error.message);
  } finally {
    killServer();
    process.exit(0);
  }
}, 5000);
