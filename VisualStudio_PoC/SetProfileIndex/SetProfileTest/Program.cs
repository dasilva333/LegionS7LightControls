// SetProfileTest/Program.cs
using System;
using System.Diagnostics;
using System.IO;
using System.Linq;
using System.Runtime.InteropServices;

public class Program
{
    [DllImport("SetProfileBridge.dll", CallingConvention = CallingConvention.Cdecl)]
    public static extern int SetProfileIndex(int profileId);

    public static void Main(string[] args)
    {
        // --- Supervisor / Worker Logic ---
        if (args.FirstOrDefault() != "--child")
        {
            // We are the parent, launch the child with the real arguments.
            string childArgs = $"--child {string.Join(" ", args)}";
            RunSupervisor(childArgs);
        }
        else
        {
            // We are the child, do the actual work.
            // Skip the "--child" argument and pass the rest.
            RunWorker(args.Skip(1).ToArray());
        }
    }

    public static void RunSupervisor(string childArgs)
    {
        Console.WriteLine("--- Supervisor: Launching worker process... ---");
        
        var startInfo = new ProcessStartInfo("dotnet", $"run {childArgs}")
        {
            UseShellExecute = false,
            RedirectStandardOutput = true,
            RedirectStandardError = true,
            CreateNoWindow = true
        };

        var process = Process.Start(startInfo);
        if (process == null) {
            Console.Error.WriteLine("Failed to start child process.");
            return;
        }

        process.OutputDataReceived += (s, e) => { if (e.Data != null) Console.WriteLine(e.Data); };
        process.ErrorDataReceived += (s, e) => { if (e.Data != null) Console.Error.WriteLine(e.Data); };
        process.BeginOutputReadLine();
        process.BeginErrorReadLine();

        bool exited = process.WaitForExit(5000); // 5-second timeout

        if (!exited) {
            Console.WriteLine("\n[Supervisor] Worker process timed out. Forcibly terminating...");
            process.Kill(true);
            Console.WriteLine("[Supervisor] Worker terminated.");
        } else {
            Console.WriteLine("\n[Supervisor] Worker process exited cleanly.");
        }
        
        Console.WriteLine("Supervisor exiting.");
    }

    public static void RunWorker(string[] workerArgs)
    {
        if (workerArgs.Length == 0 || !int.TryParse(workerArgs[0], out int profileId))
        {
            Console.Error.WriteLine("[Worker] Error: No valid profile ID provided.");
            return;
        }

        try
        {
            Console.WriteLine($"[Worker] Attempting to set Active Profile to: {profileId}...");
            int result = SetProfileIndex(profileId);

            Console.WriteLine($"[Worker] Native call returned code: {result}");
            if (result == 1) {
                Console.WriteLine("[Worker] SUCCESS: Command sent to hardware.");
            } else {
                Console.Error.WriteLine("[Worker] ERROR: Native function failed. Check dbg.log for details.");
            }
        }
        catch(Exception ex)
        {
            Console.Error.WriteLine($"[Worker] FATAL .NET EXCEPTION: {ex.Message}");
        }
    }
}