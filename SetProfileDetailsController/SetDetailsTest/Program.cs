using System;
using System.IO;
using System.Runtime.InteropServices;
using System.Diagnostics;
using System.Linq;

public class Program
{
    [DllImport("SetDetailsBridge.dll", CharSet = CharSet.Unicode, CallingConvention = CallingConvention.Cdecl)]
    public static extern bool SetProfileJson(string captureTimestamp);

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
        if (args.FirstOrDefault() == WorkerFlag)
        {
            RunWorker(args.Skip(1).ToArray());
        }
        else
        {
            RunSupervisor(args);
        }
    }

    public static void RunSupervisor(string[] args)
    {
        Console.WriteLine("--- Supervisor: Launching worker process... ---");
        var startInfo = new ProcessStartInfo("C:\\Program Files\\dotnet\\dotnet.exe")
        {
            UseShellExecute = false,
            RedirectStandardOutput = true,
            RedirectStandardError = true,
            CreateNoWindow = true
        };
        startInfo.ArgumentList.Add("run");
        startInfo.ArgumentList.Add("--");
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

            string requestedTimestamp = workerArgs.FirstOrDefault();
            if (string.IsNullOrWhiteSpace(requestedTimestamp) || requestedTimestamp.Equals("latest", StringComparison.OrdinalIgnoreCase))
            {
                requestedTimestamp = FindLatestTimestamp(trafficDir);
                if (requestedTimestamp == null)
                {
                    Console.Error.WriteLine("[Worker] No captured commands found to replay.");
                    Log("No inbound command files detected.");
                    return;
                }
            }

            Console.WriteLine($"[Worker] Replaying captured dispatcher call {requestedTimestamp}");
            Log($"Invoking SetProfileJson for timestamp {requestedTimestamp}");
            if (SetProfileJson(requestedTimestamp))
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

    private static string? FindLatestTimestamp(string trafficDir)
    {
        var files = Directory.GetFiles(trafficDir, "inbound_command_*.json");
        string? best = null;
        long bestValue = long.MinValue;
        foreach (var file in files)
        {
            var name = Path.GetFileNameWithoutExtension(file);
            var parts = name.Split('_');
            if (parts.Length < 3) continue;
            var ts = parts[2];
            if (long.TryParse(ts, out var val) && val > bestValue)
            {
                bestValue = val;
                best = ts;
            }
        }
        return best;
    }
}
