using System;
using System.Runtime.InteropServices;
using System.Threading.Tasks;

namespace EdgeWrapper
{
    // This class is for the STABLE functions loaded by edge-js
    public class StableService
    {
        private const string BridgeDll = "EdgeProfileBridge.dll";

        // --- P/Invoke Definitions ---

        [DllImport(BridgeDll, CallingConvention = CallingConvention.Cdecl)]
        private static extern int GetActiveProfileIdRaw();

        [DllImport(BridgeDll, CallingConvention = CallingConvention.Cdecl)]
        private static extern int GetBrightnessRaw();

        [DllImport(BridgeDll, CallingConvention = CallingConvention.Cdecl)]
        private static extern void ShutdownBridge();

        [DllImport(BridgeDll, CallingConvention = CallingConvention.Cdecl, CharSet = CharSet.Unicode)]
        private static extern IntPtr GetProfileJsonRaw();

        [DllImport(BridgeDll, CallingConvention = CallingConvention.Cdecl)]
        private static extern int SetProfileIndexRaw(int profileId);

        // Required to free the memory allocated by the native C++ code for GetProfileJson
        [DllImport("ole32.dll")]
        private static extern void CoTaskMemFree(IntPtr ptr);


        // --- Methods Exposed to Node.js ---
        public async Task<object> GetActiveProfileId(object input)
        {
            // Log that we are calling the native function
            Console.WriteLine("[Wrapper] Calling native GetActiveProfileIdRaw...");
            int id = GetActiveProfileIdRaw();
            // Log the immediate result we got back
            Console.WriteLine($"[Wrapper] Native GetActiveProfileIdRaw returned: {id}");

            if (id < 0) 
            {
                // This is where the error is currently being thrown
                Console.WriteLine($"[Wrapper] Value is < 0, throwing exception.");
                throw new InvalidOperationException($"Native GetActiveProfileIdRaw failed with code {id}");
            }
            return await Task.FromResult<object>(id);
        }

        public async Task<object> GetBrightness(object input)
        {
            int brightness = GetBrightnessRaw();
            if (brightness < 0) throw new InvalidOperationException($"Native GetBrightnessRaw failed with code {brightness}");
            return await Task.FromResult<object>(brightness);
        }

        public async Task<object> GetProfileJson(object input)
        {
            IntPtr ptr = GetProfileJsonRaw();
            if (ptr == IntPtr.Zero)
            {
                throw new InvalidOperationException("Native GetProfileJsonRaw returned a null pointer.");
            }
            try
            {
                string json = Marshal.PtrToStringUni(ptr);
                return await Task.FromResult<object>(json);
            }
            finally
            {
                // CRITICAL: Always free the memory allocated by the C++ bridge to prevent memory leaks.
                CoTaskMemFree(ptr);

            }
        }

        public async Task<object> SetProfileIndex(object input)
        {
            if (input == null || !int.TryParse(input.ToString(), out int profileId))
            {
                throw new ArgumentException("Payload must be an integer profile ID.", nameof(input));
            }

            int resultCode = SetProfileIndexRaw(profileId);
            
            // Per the original code, a result of -3 is a "forgivable" error that still works.
            if (resultCode < 0 && resultCode != -3)
            {
                throw new InvalidOperationException($"Native SetProfileIndexRaw failed with error code {resultCode}");
            }
            
            return await Task.FromResult<object>(true);
        }
        
        public async Task<object> Shutdown(object input)
        {
            ShutdownBridge();
            return await Task.FromResult<object>(true);
        }
    }
}