const { fork } = require('child_process');
const path = require('path');

let worker = null;
const pendingRequests = new Map();

function startWorker() {
    // Singleton pattern: If worker exists or is starting, do nothing.
    if (worker) return;

    const workerPath = path.join(__dirname, 'worker.js');
    console.log(`[FridaProxy] Spawning worker: ${workerPath}`);
    
    worker = fork(workerPath);

    // Listen for results coming back from the worker.
    worker.on('message', (message) => {
        const { taskId, data, error } = message;
        if (pendingRequests.has(taskId)) {
            const { resolve, reject } = pendingRequests.get(taskId);
            pendingRequests.delete(taskId); // Clean up immediately
            if (error) {
                reject(new Error(error));
            } else {
                resolve(data);
            }
        }
    });

    // Handle unexpected worker death.
    worker.on('exit', (code) => {
        console.error(`[FridaProxy] Worker process exited with code ${code}.`);
        worker = null;
        // Reject all pending promises on crash.
        for (const [taskId, { reject }] of pendingRequests.entries()) {
            reject(new Error("Frida worker process crashed or exited unexpectedly."));
        }
        pendingRequests.clear();
        // Optional: Implement a restart delay.
        console.log('[FridaProxy] Attempting to restart worker in 5 seconds...');
        setTimeout(startWorker, 5000);
    });
    
    worker.on('error', (err) => {
        console.error('[FridaProxy] Failed to start worker process:', err);
    });
}

/**
 * Sends a command to the persistent Frida worker and awaits the result.
 * @param {string} command - The name of the action (e.g., 'getBrightness').
 * @param {object} [payload] - Optional data for the action.
 * @returns {Promise<any>} - The result from the Frida agent.
 */
function sendCommand(command, payload) {
    // Ensure the worker is running before attempting to send a command.
    if (!worker) {
        return Promise.reject(new Error("Frida worker is not running or has crashed."));
    }

    return new Promise((resolve, reject) => {
        const taskId = Math.random().toString(36).substr(2, 9);
        pendingRequests.set(taskId, { resolve, reject });
        
        worker.send({ taskId, command, payload });
        
        // Timeout to prevent requests from hanging forever if the worker becomes unresponsive.
        setTimeout(() => {
            if (pendingRequests.has(taskId)) {
                pendingRequests.delete(taskId);
                reject(new Error(`Timeout: No response from worker for command '${command}' after 15 seconds.`));
            }
        }, 15000);
    });
}

// Start the worker as soon as this module is required.
startWorker();

// Export the single function that all other modules will use.
module.exports = { sendCommand };