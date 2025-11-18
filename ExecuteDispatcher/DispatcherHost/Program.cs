using System;
using System.Diagnostics;
using System.IO;
using System.Runtime.InteropServices;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using System.Text.Json.Nodes;

public class Program
{
    [DllImport("DispatcherBridge.dll", CharSet = CharSet.Unicode, CallingConvention = CallingConvention.Cdecl)]
    private static extern bool InvokeDispatcher(string commandJson, string payloadTag);

    // Helper to generate the 32-character random hex string for the cancelEvent.
    private static string GenerateCancelEvent()
    {
        byte[] randomBytes = RandomNumberGenerator.GetBytes(16);
        return Convert.ToHexString(randomBytes).ToLower();
    }

    public static int Main(string[] args)
    {
        string payloadFile = "";

        for (int i = 0; i < args.Length; i++)
        {
            if (args[i].Equals("--payload-file", StringComparison.OrdinalIgnoreCase) && i + 1 < args.Length)
            {
                payloadFile = args[++i];
            }
        }

        if (string.IsNullOrEmpty(payloadFile))
        {
            Console.Error.WriteLine("ERROR: --payload-file argument is required.");
            return 1;
        }
        
        string innerPayloadString;
        try
        {
            Console.WriteLine($"Reading inner payload from: {payloadFile}");
            // Read the file and validate that it's a JSON object with a "layers" array.
            string fileContent = File.ReadAllText(payloadFile);
            JsonNode? payloadNode = JsonNode.Parse(fileContent);
            if (payloadNode == null || payloadNode["layers"] is not JsonArray)
            {
                Console.Error.WriteLine("ERROR: Payload file must be a valid JSON object containing a 'layers' array.");
                return 1;
            }
            // We use the file content directly as the inner payload string.
            innerPayloadString = fileContent;
        }
        catch (Exception ex)
        {
            Console.Error.WriteLine($"ERROR: Failed to read or parse payload file '{payloadFile}': {ex.Message}");
            return 1;
        }

        // --- Build the Command Envelope (The Core Logic) ---
        Console.WriteLine("Building native command envelope...");
        try
        {
            var commandObject = new JsonObject
            {
                // Key order and types now perfectly match the working C++ reference.
                ["callerPid"] = Process.GetCurrentProcess().Id,
                ["cancelEvent"] = $"Gaming.AdvancedLighting-Set-LightingProfileDetails#{GenerateCancelEvent()}",
                ["clientId"] = "Consumer",
                ["command"] = "Set-LightingProfileDetails",
                ["contract"] = "Gaming.AdvancedLighting",
                ["payload"] = innerPayloadString, // This is the string content from the file.
                ["targetAddin"] = null
            };

            // Use options to create a compact, single-line JSON string without indentation.
            var serializerOptions = new JsonSerializerOptions { WriteIndented = false };
            string finalCommandJson = commandObject.ToJsonString(serializerOptions);
            
            Console.WriteLine($"SUCCESS: Command envelope built. Size: {finalCommandJson.Length} bytes.");
            
            // --- Dispatch ---
            Console.WriteLine("Invoking native dispatcher...");
            InvokeDispatcher(finalCommandJson, "write_log");
            
            Console.WriteLine("UNEXPECTED_SUCCESS: Dispatcher returned without terminating the process.");
            return 0; // Success
        }
        catch (Exception ex)
        {
            Console.Error.WriteLine($"FATAL_ERROR: An exception occurred: {ex.GetType().Name} - {ex.Message}");
            return 1; // Failure
        }
    }
}