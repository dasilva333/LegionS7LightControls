using System.Runtime.InteropServices;
using System.Threading.Tasks;

namespace EdgeWrapper
{
    public class ProfileService
    {
        [DllImport("EdgeProfileBridge.dll", CallingConvention = CallingConvention.Cdecl)]
        private static extern int GetActiveProfileIdRaw();

        [DllImport("EdgeProfileBridge.dll", CallingConvention = CallingConvention.Cdecl)]
        private static extern void ShutdownEdgeBridge();

        public async Task<object> GetActiveProfileId(object input)
        {
            int id = GetActiveProfileIdRaw();
            if (id < 0)
            {
                throw new System.InvalidOperationException($"Native call failed with code {id}");
            }
            return await Task.FromResult<object>(id);
        }

        public async Task<object> ShutdownBridge(object input)
        {
            ShutdownEdgeBridge();
            return await Task.FromResult<object>(null);
        }
    }
}
