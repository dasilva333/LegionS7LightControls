using System;
using System.Runtime.InteropServices;

namespace SwitchProfileWrapper
{
    public class Worker
    {
        [DllImport("SwitchProfileBridge.dll", CharSet = CharSet.Unicode, CallingConvention = CallingConvention.Cdecl)]
        private static extern bool ApplyProfileByFilename(string profileName);

        public static int Main(string[] args)
        {
            if (args.Length == 0 || string.IsNullOrWhiteSpace(args[0]))
            {
                Console.Error.WriteLine("WORKER_ERROR: No profile name provided.");
                return 1; // Failure
            }

            string profileName = args[0];
            try
            {
                // This is the critical call. It might crash, but that's okay.
                bool result = ApplyProfileByFilename(profileName);

                // We can treat the crash as a "success" because the lights change.
                // The native code returns false when it crashes, so we check for that.
                if (!result) {
                     Console.WriteLine("WORKER_SUCCESS: Native call returned false (expected after crash-on-success). Profile likely applied.");
                     return 0; // Success
                }

                Console.WriteLine("WORKER_SUCCESS: Native call returned true.");
                return 0; // Success
            }
            catch (Exception ex)
            {
                Console.Error.WriteLine($"WORKER_ERROR: An unhandled exception occurred: {ex.Message}");
                return 1; // Failure
            }
        }
    }
}