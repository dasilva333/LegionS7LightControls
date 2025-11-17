using System;
using System.Collections.Generic;
using System.Runtime.InteropServices;
using System.Threading.Tasks;
using System.Text.Json;

namespace EdgeWrapper
{
    public class ProfileService
    {
        private const string BridgeDll = "EdgeProfileBridge.dll";

        [DllImport(BridgeDll, CallingConvention = CallingConvention.Cdecl)]
        private static extern int GetActiveProfileIdRaw();

        [DllImport(BridgeDll, CallingConvention = CallingConvention.Cdecl)]
        private static extern int GetBrightnessRaw();

        [DllImport(BridgeDll, CallingConvention = CallingConvention.Cdecl)]
        private static extern IntPtr GetProfileJsonRaw();

        [DllImport(BridgeDll, CallingConvention = CallingConvention.Cdecl, CharSet = CharSet.Unicode)]
        [return: MarshalAs(UnmanagedType.I1)]
        private static extern bool SetProfileDetailsJsonRaw(string jsonPayload);

        [DllImport(BridgeDll, CallingConvention = CallingConvention.Cdecl, CharSet = CharSet.Unicode)]
        [return: MarshalAs(UnmanagedType.I1)]
        private static extern bool SendRawTrafficRaw(string commandJson, string payloadJson);

        [DllImport(BridgeDll, CallingConvention = CallingConvention.Cdecl)]
        private static extern int SetProfileIndexRaw(int profileId);

        [DllImport(BridgeDll, CallingConvention = CallingConvention.Cdecl)]
        private static extern void ShutdownBridge();

        [DllImport("ole32.dll", CallingConvention = CallingConvention.StdCall)]
        private static extern void CoTaskMemFree(IntPtr ptr);

        public async Task<object> GetActiveProfileId(object input)
        {
            int id = GetActiveProfileIdRaw();
            if (id < 0) throw new InvalidOperationException($"Native call failed with code {id}");
            return await Task.FromResult<object>(id);
        }

        public async Task<object> GetBrightness(object input)
        {
            int brightness = GetBrightnessRaw();
            if (brightness < 0) throw new InvalidOperationException($"Brightness call failed (code {brightness})");
            return await Task.FromResult<object>(brightness);
        }

        public async Task<object> GetProfileJson(object input)
        {
            IntPtr ptr = GetProfileJsonRaw();
            if (ptr == IntPtr.Zero) throw new InvalidOperationException("Native JSON call returned null");
            string json = Marshal.PtrToStringUni(ptr) ?? string.Empty;
            CoTaskMemFree(ptr);
            return await Task.FromResult<object>(json);
        }

        public async Task<object> SetProfileDetails(object input)
        {
            if (input == null) throw new ArgumentNullException(nameof(input));
            string payload = input as string ?? input.ToString();
            bool result = SetProfileDetailsJsonRaw(payload);
            if (!result) throw new InvalidOperationException("SetProfileDetailsJsonRaw failed");
            return await Task.FromResult<object>(true);
        }

        public async Task<object> SendRawTraffic(object input)
        {
            if (input == null) throw new ArgumentNullException(nameof(input));
            string commandJson = null;
            string payloadJson = null;

            if (input is IDictionary<string, object> dict)
            {
                if (dict.TryGetValue("command", out var cmd)) commandJson = cmd?.ToString();
                if (dict.TryGetValue("payload", out var payload)) payloadJson = payload?.ToString();
            }
            else
            {
                commandJson = input as string ?? input.ToString();
            }

            // This block replaces the old JavaScriptSerializer logic
            if (string.IsNullOrWhiteSpace(payloadJson) && !string.IsNullOrWhiteSpace(commandJson))
            {
                try
                {
                    // Use the modern System.Text.Json parser
                    JsonDocument doc = JsonDocument.Parse(commandJson);
                    if (doc.RootElement.TryGetProperty("payload", out JsonElement payloadElement))
                    {
                        // The payload property is a string, so get its string value
                        payloadJson = payloadElement.GetString();
                    }
                }
                catch (JsonException)
                {
                    // ignore parsing issues, same as before
                }
            }

            bool result = SendRawTrafficRaw(commandJson, payloadJson);
            if (!result) throw new InvalidOperationException("SendRawTrafficRaw failed");
            return await Task.FromResult<object>(true);
        }

        public async Task<object> SetProfileIndex(object input)
        {
            if (input == null) throw new ArgumentNullException(nameof(input));
            if (!int.TryParse(input.ToString(), out int profileId))
            {
                throw new ArgumentException("Profile index must be an integer", nameof(input));
            }
            int code = SetProfileIndexRaw(profileId);
            if (code != 1 && code != -3)
            {
                throw new InvalidOperationException($"SetProfileIndexRaw failed (code {code})");
            }
            return await Task.FromResult<object>(true);
        }

        public async Task<object> ShutdownBridge(object input)
        {
            ShutdownBridge();
            return await Task.FromResult<object>(null);
        }
    }
}
