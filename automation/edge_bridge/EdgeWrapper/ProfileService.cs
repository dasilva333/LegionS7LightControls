using System;
using System.Runtime.InteropServices;
using System.Threading.Tasks;

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
        private static extern bool SendRawTrafficRaw(string commandJson);

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
            string packet = input as string ?? input.ToString();
            bool result = SendRawTrafficRaw(packet);
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
