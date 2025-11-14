const edge = require('edge-js');
const path = require('path');

// --- C# Bridge to the C++ Bridge ---
// This is the cleanest way to call our C++ DLL from Node.js
const callBridge = edge.func({
    source: `
        using System;
        using System.Runtime.InteropServices;
        using System.Text;
        using System.Threading.Tasks;

        public class Startup
        {
            [DllImport("ProfileReader.dll", CharSet = CharSet.Unicode, CallingConvention = CallingConvention.Cdecl)]
            public static extern bool DispatchCommand(string command, string payload, StringBuilder outBuffer, int bufferSize);

            public async Task<object> Invoke(dynamic input)
            {
                string command = (string)input.command;
                string payload = (string)input.payload;
                
                StringBuilder buffer = new StringBuilder(1024 * 16);

                if (DispatchCommand(command, payload, buffer, buffer.Capacity))
                {
                    return buffer.ToString();
                }
                else
                {
                    throw new Exception("The native DispatchCommand function returned false.");
                }
            }
        }
    `,
    references: [ path.join(__dirname, 'ProfileReader.dll') ]
});


// --- The Main Control Logic ---
async function main() {
    try {
        console.log("--- Lenovo LED Controller ---");

        // First, let's get the details for the currently active profile (e.g., 4)
        // This validates our connection and gives us a template.
        console.log("\n[1] Getting details for Profile 4...");
        let profileDetails = await callBridge({
            command: "Get-LightingProfileInfo",
            payload: JSON.stringify({ ProfileId: 4 })
        });
        console.log("SUCCESS! Received Profile JSON:");
        console.log(profileDetails);
        
        // --- YOUR GOAL: Set a custom static color ---
        console.log("\n[2] Building and sending a custom profile to set keyboard to BLUE...");

        // We use the schema the MCP agent discovered to build our own profile.
        // We will overwrite Profile 5 with our custom color.
        const customProfile = {
            profileId: 5, // Target a slot we can safely overwrite
            layers: [
                {
                    layerId: 0,
                    keys: [], // Empty 'keys' array often means "all keys"
                    animationConfig: {
                        animationId: 1, // Static color is usually a low ID
                        speed: 50,
                        clockwise: 0,
                        direction: 0,
                        colorType: 1,
                        colorSize: 1,
                        colorList: [ { r: 0, g: 0, b: 255 } ], // Pure Blue
                        transition: 0
                    }
                }
            ]
        };

        await callBridge({
            command: "Set-LightingProfileDetails",
            payload: JSON.stringify(customProfile)
        });
        console.log("Custom profile sent successfully.");

        // --- Activate the new profile ---
        console.log("\n[3] Activating our custom profile (ID 5)...");
        await callBridge({
            command: "Set-LightingProfileIndex",
            payload: JSON.stringify({ ProfileId: 5 })
        });
        console.log("SUCCESS! Keyboard should now be BLUE.");
        console.log("Check your keyboard!");

    } catch (error) {
        console.error("\n--- AN ERROR OCCURRED ---");
        console.error(error);
    }
}

main();