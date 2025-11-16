using System;
using System.Runtime.InteropServices;
using System.Threading.Tasks;

namespace EdgeWrapper
{
    public class ProfileService
    {
        [DllImport("ProfileBridge.dll", CallingConvention = CallingConvention.Cdecl, CharSet = CharSet.Unicode)]
        private static extern IntPtr GetProfileJson();

        public async Task<object> GetActiveProfileId(object input)
        {
            IntPtr ptr = GetProfileJson();
            if (ptr == IntPtr.Zero)
            {
                throw new InvalidOperationException("GetProfileJson returned null");
            }

            string json = Marshal.PtrToStringUni(ptr) ?? string.Empty;
            Marshal.FreeCoTaskMem(ptr);

            if (string.IsNullOrWhiteSpace(json))
            {
                throw new InvalidOperationException("Empty JSON received");
            }

            int profileId = ParseProfileId(json);
            return await Task.FromResult<object>(profileId);
        }

        private static int ParseProfileId(string json)
        {
            const string marker = "\"profileId\"";
            int idx = json.IndexOf(marker, StringComparison.OrdinalIgnoreCase);
            if (idx < 0)
            {
                throw new InvalidOperationException("profileId not found in JSON");
            }
            idx = json.IndexOf(':', idx);
            if (idx < 0) throw new InvalidOperationException("profileId delimiter missing");
            idx++;
            while (idx < json.Length && char.IsWhiteSpace(json[idx])) idx++;
            int start = idx;
            while (idx < json.Length && char.IsDigit(json[idx])) idx++;
            string number = json.Substring(start, idx - start);
            if (!int.TryParse(number, out int value))
            {
                throw new InvalidOperationException("Unable to parse profileId");
            }
            return value;
        }
    }
}
