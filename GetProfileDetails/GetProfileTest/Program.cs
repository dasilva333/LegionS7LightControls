using System;
using System.Diagnostics;
using System.IO;
using System.Linq;
using System.Runtime.InteropServices;
using System.Text;
using System.Threading;

public class Program
{
    [DllImport("ProfileBridge.dll", CharSet = CharSet.Unicode, CallingConvention = CallingConvention.Cdecl)]
    public static extern IntPtr GetProfileJson();

    [DllImport("Ole32.dll")]
    private static extern void CoTaskMemFree(IntPtr ptr);

    public static void Main(string[] args)
    {
        // --- SUPERVISOR / WORKER LOGIC ---
        // If we are the main process, launch a child and wait for it.
        // If we are the child process, do the actual work.
        if (args.FirstOrDefault() != "--child")
        {
            RunSupervisor();
        }
        else
        {
            RunWorker();
        }
    }

    // --- SUPERVISOR ---
    // This is the clean process that you interact with.
    public static void RunSupervisor()
    {
        Console.WriteLine("--- Supervisor: Launching worker process... ---");
        
        var startInfo = new ProcessStartInfo("dotnet", "run -- --child")
        {
            UseShellExecute = false,
            RedirectStandardOutput = true,
            RedirectStandardError = true,
            CreateNoWindow = true
        };

        var process = Process.Start(startInfo);
        if (process == null)
        {
            Console.Error.WriteLine("Failed to start child process.");
            return;
        }

        // Read the output from the child process in real-time
        process.OutputDataReceived += (sender, e) => { if (e.Data != null) Console.WriteLine(e.Data); };
        process.ErrorDataReceived += (sender, e) => { if (e.Data != null) Console.Error.WriteLine(e.Data); };
        process.BeginOutputReadLine();
        process.BeginErrorReadLine();

        // Wait for the process to exit, with a 5-second timeout
        bool exited = process.WaitForExit(5000); // 5000ms = 5 seconds

        if (!exited)
        {
            Console.WriteLine("\n[Supervisor] Worker process timed out. Forcibly terminating...");
            process.Kill(true); // Kill the entire process tree
            Console.WriteLine("[Supervisor] Worker terminated.");
        }
        else
        {
            Console.WriteLine("\n[Supervisor] Worker process exited cleanly.");
        }
        
        Console.WriteLine("Supervisor exiting. Press Enter to close.");
        Console.ReadLine();
    }


    // --- WORKER ---
    // This is the disposable process that does the dangerous native call.
    public static void RunWorker()
    {
        try
        {
            Console.WriteLine("\n[Worker] Requesting full profile details...");
            IntPtr resultPtr = IntPtr.Zero;
            try
            {
                resultPtr = GetProfileJson();
                if (resultPtr == IntPtr.Zero) throw new Exception("The native function returned a NULL pointer.");

                string resultJson = Marshal.PtrToStringUni(resultPtr) ?? "EMPTY RESPONSE";

                Console.WriteLine("\n========================================");
                Console.WriteLine("      SUCCESS! Received Profile JSON:");
                Console.WriteLine("========================================");
                Console.WriteLine(resultJson);
            }
            finally
            {
                if (resultPtr != IntPtr.Zero) { CoTaskMemFree(resultPtr); }
            }
        }
        catch (Exception ex)
        {
            Console.Error.WriteLine($"\n--- AN ERROR OCCURRED IN WORKER ---\n{ex.Message}");
        }
    }
}