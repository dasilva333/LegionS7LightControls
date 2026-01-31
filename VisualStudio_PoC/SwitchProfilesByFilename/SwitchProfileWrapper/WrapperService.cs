using System;
using System.Runtime.InteropServices;
using System.Threading.Tasks;

namespace SwitchProfileWrapper
{
    public class WrapperService
    {
        // This DllImport matches the one in your working Program.cs
        [DllImport("SwitchProfileBridge.dll", CharSet = CharSet.Unicode, CallingConvention = CallingConvention.Cdecl)]
        private static extern bool ApplyProfileByFilename(string profileName);

        // This is the method that will be exposed to Node.js
        public async Task<object> ApplyProfile(object input)
        {
            if (input == null)
            {
                throw new ArgumentNullException(nameof(input), "Profile filename cannot be null.");
            }

            string profileName = input.ToString();
            if (string.IsNullOrWhiteSpace(profileName))
            {
                throw new ArgumentException("Profile filename cannot be empty.", nameof(input));
            }

            // Call the known-good native function
            bool result = ApplyProfileByFilename(profileName);

            if (!result)
            {
                // If it fails, throw an exception so Node.js knows about it.
                throw new InvalidOperationException("The native ApplyProfileByFilename function returned false. Check switch_profile_by_filename.log for errors.");
            }

            // Return true on success
            return await Task.FromResult(true);
        }
    }
}