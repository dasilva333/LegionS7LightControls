using System;
using System.IO;
using System.Runtime.InteropServices;
using System.Diagnostics;
using System.Linq;

public class Program
{
    [DllImport("SetDetailsBridge.dll", CharSet = CharSet.Unicode, CallingConvention = CallingConvention.Cdecl)]
    public static extern bool SetProfileJson(string captureTimeline);

    private static readonly string LogFolder = Path.Combine(
        Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData),
        "ProfileBridge");
    private static readonly string WorkerLogPath = Path.Combine(LogFolder, "details_setter_worker.log");

    private static void Log(string message)
    {
        Directory.CreateDirectory(LogFolder);
        File.AppendAllText(WorkerLogPath, $"[{DateTime.Now:yyyy-MM-dd HH:mm:ss.fff}] {message}{Environment.NewLine}");
    }

    private const string WorkerFlag = "--worker";

    public static void Main(string[] args)
    {
        // ALWAYS debug the worker directly when running under Visual Studio
        if (Debugger.IsAttached)
        {
            RunWorker(args);
            return;
        }

        // Otherwise headless mode (supervisor + worker)
        if (args.Contains(WorkerFlag))
        {
            RunWorker(args);
        }
        else
        {
            RunSupervisor(args);
        }
    }



    public static void RunSupervisor(string[] args)
    {
        Console.WriteLine("--- Supervisor: Launching worker process... ---");
        var exePath = Process.GetCurrentProcess().MainModule!.FileName;
        var startInfo = new ProcessStartInfo(exePath)
        {
            UseShellExecute = false,
            RedirectStandardOutput = true,
            RedirectStandardError = true,
            CreateNoWindow = true
        };

        startInfo.ArgumentList.Add(WorkerFlag);

        foreach (var arg in args)
        {
            startInfo.ArgumentList.Add(arg);
        }


        var process = Process.Start(startInfo);
        if (process == null) return;
        process.OutputDataReceived += (s, e) => { if (e.Data != null) Console.WriteLine(e.Data); };
        process.ErrorDataReceived += (s, e) => { if (e.Data != null) Console.Error.WriteLine(e.Data); };
        process.BeginOutputReadLine();
        process.BeginErrorReadLine();
        if (!process.WaitForExit(5000))
        {
            Console.WriteLine("\n[Supervisor] Worker timed out. Terminating...");
            process.Kill(true);
        }
        else
        {
            Console.WriteLine("\n[Supervisor] Worker exited cleanly.");
        }
    }

    public static void RunWorker(string[] workerArgs)
    {
        string trafficDir = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData), "Temp", "traffic");
        Directory.CreateDirectory(LogFolder);

        try
        {
            Console.WriteLine("[Worker] --- Set Profile Details Test ---");
            Log("Worker started");
            if (!Directory.Exists(trafficDir))
            {
                Console.Error.WriteLine($"[Worker] Traffic folder missing at '{trafficDir}'");
                Log($"Traffic folder missing: {trafficDir}");
                return;
            }

        var requestedTimestamps = workerArgs
            .Where(arg => !string.IsNullOrWhiteSpace(arg) && !string.Equals(arg, WorkerFlag, StringComparison.OrdinalIgnoreCase))
                .ToList();

            if (requestedTimestamps.Count == 0)
            {
                Console.Error.WriteLine("[Worker] Provide the timestamps to replay in the desired order.");
                Log("Run aborted: no timestamps supplied.");
                return;
            }

            var joined = string.Join(",", requestedTimestamps);
            Console.WriteLine($"[Worker] Replaying captured dispatcher calls: {string.Join(" ", requestedTimestamps)}");
            Log($"Invoking SetProfileJson for timeline {joined}");

            if (SetProfileJson(joined))
            {
                Console.WriteLine("[Worker] SUCCESS: Dispatcher call completed. Check details_setter.log and last_set_result.json.");
                Log("SetProfileJson returned true");
            }
            else
            {
                Console.Error.WriteLine("[Worker] ERROR: Dispatcher replay failed. Inspect details_setter.log for details.");
                Log("SetProfileJson returned false");
            }
        }
        catch (Exception ex)
        {
            Console.Error.WriteLine($"\n[Worker] AN ERROR OCCURRED: {ex.Message}");
            Log($"Exception: {ex}");
        }
    }

}
