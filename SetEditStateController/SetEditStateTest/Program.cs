using System;
using System.IO;
using System.Runtime.InteropServices;

internal static class Program
{
    [DllImport("SetEditStateBridge.dll", CharSet = CharSet.Unicode, CallingConvention = CallingConvention.Cdecl)]
    private static extern bool DispatchEditState(string timestamp);

    private static readonly string LogFolder = Path.Combine(
        Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData),
        "ProfileBridge");

    private static readonly string WorkerLogPath = Path.Combine(LogFolder, "edit_state_worker.log");

    private static void Log(string message)
    {
        Directory.CreateDirectory(LogFolder);
        File.AppendAllText(WorkerLogPath, $"[{DateTime.Now:yyyy-MM-dd HH:mm:ss.fff}] {message}{Environment.NewLine}");
    }

    public static int Main(string[] args)
    {
        Directory.CreateDirectory(LogFolder);
        if (args.Length == 0)
        {
            Console.Error.WriteLine("Usage: dotnet run -- <timestamp> [timestamp2 ...]");
            return 1;
        }

        int failures = 0;
        foreach (var ts in args)
        {
            if (string.IsNullOrWhiteSpace(ts)) continue;

            Console.WriteLine($"[EditStateTest] Replaying capture {ts}");
            Log($"DispatchEditState begin {ts}");
            try
            {
                if (DispatchEditState(ts))
                {
                    Console.WriteLine("[EditStateTest] SUCCESS");
                    Log($"DispatchEditState success {ts}");
                }
                else
                {
                    Console.Error.WriteLine("[EditStateTest] ERROR - bridge reported failure");
                    Log($"DispatchEditState failure {ts}");
                    failures++;
                }
            }
            catch (DllNotFoundException ex)
            {
                Console.Error.WriteLine($"[EditStateTest] Missing bridge DLL: {ex.Message}");
                Log($"DLL missing: {ex}");
                failures++;
            }
        }

        return failures == 0 ? 0 : 2;
    }
}
