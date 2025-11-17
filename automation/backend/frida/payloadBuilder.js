/**
 * Constructs the full native command envelope required by the Set-LightingProfileDetails dispatcher.
 * This is a pure, synchronous function.
 * @param {object} finalLayersObject - The complete { layers, profileId } object, with the live profileId already injected.
 * @returns {{commandString: string, payloadString: string}} The two strings required by the native dispatcher.
 */
function buildSetProfileDetailsCommand(finalLayersObject) {
    // 1. Stringify the finalized layers object. This becomes the "inner payload".
    const innerPayloadString = JSON.stringify(finalLayersObject);

    // 2. Construct the full "command envelope" object.
    const commandObject = {
        contract: "Gaming.AdvancedLighting",
        command: "Set-LightingProfileDetails",
        payload: innerPayloadString, // The payload is the stringified inner object.
        targetAddin: null,
        // Generate a random cancel event, similar to the native code.
        cancelEvent: `Gaming.AdvancedLighting-Set-LightingProfileDetails#${Math.random().toString(16).slice(2)}`,
        clientId: "Consumer",
        callerPid: process.pid
    };

    // 3. Stringify the entire command envelope.
    const commandString = JSON.stringify(commandObject);

    // 4. Return the two strings required by the dispatcher.
    // Based on the working C++ reference, the second payload is a hardcoded tag.
    return {
        commandString: commandString,
        payloadString: "write_log"
    };
}

module.exports = { buildSetProfileDetailsCommand };