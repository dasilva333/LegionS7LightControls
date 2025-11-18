/**
 * Express route handler for applying a lighting profile from a saved JSON file.
 * This now uses the robust external C# worker process.
 */

// We only need the new profileExecutor helper.
// We are completely bypassing the Frida stack for this write operation.
const { profileExecutor } = require('../helpers/profileExecutor.js');

module.exports = {
  method: "post",
  route: "/profiles/apply-by-file",
  
  /**
   * @param {import('express').Request} req
   * @param {import('express').Response} res
   */
  handler: async (req, res) => {
    const { filename } = req.body;
    if (!filename) {
        return res.status(400).json({ success: false, error: "Request body must include a 'filename'." });
    }

    try {
      console.log(`\n--- [API /apply-by-file] Processing '${filename}' ---`);

      // THE FIX: The logic is now a single, simple call to the executor.
      // The executor handles spawning the C# process, which in turn reads the file
      // and builds the native command.
      console.log(`[API] Dispatching command to external worker...`);
      await profileExecutor(filename);

      // Since the worker's termination is our success signal, we can just return a success message.
      res.json({ success: true, filename, note: "Profile application command sent to worker." });

    } catch (err) {
      console.error(`[API /apply-by-file] FATAL ERROR: ${err.message}`);
      res.status(500).json({ success: false, error: err.message });
    }
  }
};