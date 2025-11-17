using System;
using System.Runtime.InteropServices;
using System.Threading.Tasks;

namespace SetProfileDetailsWrapper
{
    public class WrapperService
    {
        [DllImport("SetDetailsBridge.dll", CharSet = CharSet.Unicode, CallingConvention = CallingConvention.Cdecl)]
        private static extern bool SetProfileJson(string captureTimeline);

        public async Task<object> ReplayTimeline(object input)
        {
            if (input == null)
            {
                throw new ArgumentNullException(nameof(input), "Timestamp string cannot be null.");
            }

            string timeline = input.ToString();
            if (string.IsNullOrWhiteSpace(timeline))
            {
                throw new ArgumentException("Timestamp string cannot be empty.", nameof(input));
            }

            bool result = SetProfileJson(timeline);

            if (!result)
            {
                throw new InvalidOperationException("The native SetProfileJson function returned false. Check details_setter.log for errors.");
            }

            return await Task.FromResult(true);
        }
    }
}