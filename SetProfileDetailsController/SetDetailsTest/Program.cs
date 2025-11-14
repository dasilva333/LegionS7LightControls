using System;
using System.IO;
using System.Runtime.InteropServices;
using System.Diagnostics;
using System.Linq;

public class Program
{
    [DllImport("SetDetailsBridge.dll", CharSet = CharSet.Unicode, CallingConvention = CallingConvention.Cdecl)]
    public static extern bool SetProfileJson(string profileJson);

    private static readonly string LogFolder = Path.Combine(
        Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData),
        "ProfileBridge");
    private static readonly string WorkerLogPath = Path.Combine(LogFolder, "details_setter_worker.log");

    private static void Log(string message)
    {
        Directory.CreateDirectory(LogFolder);
        File.AppendAllText(WorkerLogPath, $"[{DateTime.Now:yyyy-MM-dd HH:mm:ss.fff}] {message}{Environment.NewLine}");
    }

    public static void Main(string[] args)
    {
        // Use the Supervisor/Worker pattern
        if (args.FirstOrDefault() != "--child")
        {
            RunSupervisor(string.Join(" ", args));
        }
        else
        {
            RunWorker(args.Skip(1).ToArray());
        }
    }

    public static void RunSupervisor(string childArgs)
    {
        Console.WriteLine("--- Supervisor: Launching worker process... ---");
        var startInfo = new ProcessStartInfo("C:\\Program Files\\dotnet\\dotnet.exe", $"run -- {childArgs}") { UseShellExecute = false, RedirectStandardOutput = true, CreateNoWindow = true };
        var process = Process.Start(startInfo);
        if (process == null) return;
        process.OutputDataReceived += (s, e) => { if (e.Data != null) Console.WriteLine(e.Data); };
        process.BeginOutputReadLine();
        if (!process.WaitForExit(5000)) {
            Console.WriteLine("\n[Supervisor] Worker timed out. Terminating...");
            process.Kill(true);
        } else {
            Console.WriteLine("\n[Supervisor] Worker exited cleanly.");
        }
    }

    public static void RunWorker(string[] workerArgs)
    {
        string filePath = @"C:\Users\h4rdc\keyboard-led-project\SetProfileDetailsController\always_dark_red.json";

        try
        {
            Console.WriteLine("[Worker] --- Set Profile Details Test ---");
            Log("Worker started");
            if (!File.Exists(filePath)) {
                Console.Error.WriteLine($"[Worker] Error: File not found at '{filePath}'");
                Log($"File not found: {filePath}");
                return;
            }
            string profileJson = File.ReadAllText(filePath);
            Log($"Read profile JSON ({profileJson.Length} chars)");
            
            Console.WriteLine($"[Worker] Attempting to set profile using JSON from '{Path.GetFileName(filePath)}'...");
            Log("Calling SetProfileJson...");
            if (SetProfileJson(profileJson))
            {
                Console.WriteLine("[Worker] SUCCESS: 'SetProfileDetails' command sent without crashing.");
                Console.WriteLine("[Worker] Check your keyboard. It should be DARK RED.");
                Log("SetProfileJson returned true");
            }
            else
            {
                Console.Error.WriteLine("[Worker] ERROR: 'SetProfileDetails' call failed or threw a native exception.");
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
