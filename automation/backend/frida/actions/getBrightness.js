/**
 * Calls the getBrightness RPC function on the Frida agent.
 * @param {object} agentApi - The rpc.exports object from the Frida agent.
 * @param {any} payload - The payload for this action (unused for getBrightness).
 * @returns {Promise<number>} - The brightness level.
 */
module.exports = async function getBrightness(agentApi, payload) {
    if (!agentApi || typeof agentApi.getBrightness !== 'function') {
        throw new Error('Agent API or getBrightness function is not available.');
    }
    const brightness = await agentApi.getBrightness();
    return brightness;
};