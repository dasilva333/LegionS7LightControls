using System;
using System.Diagnostics;
using System.Linq;
using System.Runtime.InteropServices;

public class Program
{
    // --- P/Invoke Signatures ---
    [DllImport("SetBrightnessBridge.dll", CallingConvention = CallingConvention.Cdecl)]
    public static extern int GetBrightness();

    [DllImport("SetBrightnessBridge.dll", CallingConvention = CallingConvention.Cdecl)]
    public static extern bool SetBrightness(int brightness);

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

    // --- SUPERVISOR ---
    // This is the clean process that you interact with.
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

        // Wait for the process to exit, with a 5-second timeout
        bool exited = process.WaitForExit(5000);

        if (!exited) {
            Console.WriteLine("\n[Supervisor] Worker process timed out. Forcibly terminating...");
            process.Kill(true); // Kill the entire process tree
            Console.WriteLine("[Supervisor] Worker terminated.");
        } else {
            Console.WriteLine("\n[Supervisor] Worker process exited cleanly.");
        }
        
        Console.WriteLine("Supervisor exiting.");
    }

    // --- WORKER ---
    // This is the disposable process that does the dangerous native call.
    public static void RunWorker(string[] workerArgs)
    {
        if (workerArgs.Length == 0 || !int.TryParse(workerArgs[0], out int newBrightness))
        {
            Console.Error.WriteLine("[Worker] Error: No valid brightness level provided.");
            return;
        }

        if (newBrightness < 0 || newBrightness > 9)
        {
            Console.Error.WriteLine("[Worker] Error: Brightness must be between 0 and 9.");
            return;
        }

        try
        {
            Console.WriteLine("[Worker] --- Brightness Controller Test ---");
            
            int initialBrightness = GetBrightness();
            Console.WriteLine($"[Worker] Initial Brightness: {initialBrightness}");
            
            Console.WriteLine($"\n[Worker] Attempting to set brightness to: {newBrightness}...");
            if (SetBrightness(newBrightness))
            {
                Console.WriteLine("[Worker] SUCCESS: 'SetBrightness' command sent.");
                
                System.Threading.Thread.Sleep(200);

                int finalBrightness = GetBrightness();
                Console.WriteLine($"[Worker] Verification -> New Brightness is: {finalBrightness}");

                if (finalBrightness == newBrightness)
                {
                    Console.WriteLine("[Worker] Verification PASSED!");
                }
                else
                {
                    Console.Error.WriteLine("[Worker] Verification FAILED: Brightness did not change to the expected value.");
                }
            }
            else
            {
                Console.Error.WriteLine("[Worker] ERROR: 'SetBrightness' call failed or crashed in native code.");
            }
        }
        catch(Exception ex)
        {
            Console.Error.WriteLine($"[Worker] FATAL .NET EXCEPTION: {ex.Message}");
        }
    }
}