/**
 * Generates a 32-character random hexadecimal string, mimicking the native implementation.
 * @returns {string}
 */
function generateCancelEventId() {
    const randomHexChar = () => Math.floor(Math.random() * 16).toString(16);
    return Array.from({ length: 32 }, randomHexChar).join('');
}

/**
 * Constructs the final native command envelope string with CORRECT escaping and key order.
 * @param {object} finalLayersObject - The complete { layers, profileId } object.
 * @returns {{commandString: string, payloadString: string}}
 */
function buildSetProfileDetailsCommand(finalLayersObject) {
    // 1. Stringify the inner payload. This creates the correctly formatted string
    // that the native code expects inside the "payload" key.
    const innerPayloadString = JSON.stringify(finalLayersObject);

    // 2. THE FIX: Construct the command object with the keys in the exact order
    // observed in the working C++ log file.
    const commandObject = {
        callerPid: process.pid,
        cancelEvent: `Gaming.AdvancedLighting-Set-LightingProfileDetails#${generateCancelEventId()}`,
        clientId: "Consumer",
        command: "Set-LightingProfileDetails",
        contract: "Gaming.AdvancedLighting",
        payload: innerPayloadString, // This is a string, which JSON.stringify will correctly escape.
        targetAddin: null
    };

    // 3. Stringify the final envelope. Because 'innerPayloadString' is already a string,
    // JSON.stringify will correctly wrap it in quotes and escape its contents,
    // producing the EXACT format we need: "payload":"{\"layers\":...}"
    const commandString = JSON.stringify(commandObject);

    return {
        commandString: commandString,
        payloadString: "write_log"
    };
}

module.exports = { buildSetProfileDetailsCommand };