using System;
using System.Runtime.InteropServices;

namespace EdgeWrapper
{
    // This class is the entry point for the CRASHABLE worker executable
    public class Worker
    {
        private const string BridgeDll = "EdgeProfileBridge.dll";

        [DllImport(BridgeDll, CallingConvention = CallingConvention.Cdecl, CharSet = CharSet.Unicode)]
        [return: MarshalAs(UnmanagedType.I1)]
        private static extern bool ExecuteDispatcherCommand(string commandJson, string payloadJson);

        public static int Main(string[] args)
        {
            // The command and payload JSON will be passed as command-line arguments
            if (args.Length < 2)
            {
                Console.Error.WriteLine("WORKER_ERROR: Insufficient arguments. Expected commandJson and payloadJson.");
                return 1; // Failure
            }

            string commandJson = args[0];
            string payloadJson = args[1];

            try
            {
                // This is the single, dangerous call.
                // It is expected to potentially crash the process.
                bool result = ExecuteDispatcherCommand(commandJson, payloadJson);

                // If the process survives the call, we report success based on the return value.
                // The native bridge returns false on a handled crash, which we treat as success.
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