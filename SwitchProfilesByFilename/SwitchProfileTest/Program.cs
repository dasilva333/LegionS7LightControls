using System;
using System.Diagnostics;
using System.IO;
using System.Linq;
using System.Runtime.InteropServices;

class Program
{
    [DllImport("SwitchProfileBridge.dll", CharSet = CharSet.Unicode, CallingConvention = CallingConvention.Cdecl)]
    private static extern bool ApplyProfileByFilename(string profileName);

    private const string WorkerFlag = "--worker";
    private static readonly string LogFolder = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData), "ProfileBridge");
    private static readonly string LogPath = Path.Combine(LogFolder, "switch_profile_worker.log");

    static void Main(string[] args)
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

    private static void RunSupervisor(string[] args)
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

        var proc = Process.Start(startInfo);
        if (proc == null) return;
        proc.OutputDataReceived += (_, e) => { if (e.Data != null) Console.WriteLine(e.Data); };
        proc.ErrorDataReceived += (_, e) => { if (e.Data != null) Console.Error.WriteLine(e.Data); };
        proc.BeginOutputReadLine();
        proc.BeginErrorReadLine();
        if (!proc.WaitForExit(10000))
        {
            Console.WriteLine("\n[Supervisor] Worker timed out. Terminating...");
            proc.Kill(true);
        }
        else
        {
            Console.WriteLine("\n[Supervisor] Worker exited cleanly.");
        }
    }

    private static void RunWorker(string[] workerArgs)
    {
        Directory.CreateDirectory(LogFolder);
        using var log = new StreamWriter(LogPath, append: true);
        log.WriteLine($"[{DateTime.Now:O}] Worker started");

        if (workerArgs.Length < 1)
        {
            Console.Error.WriteLine("[Worker] Usage: dotnet run -- <profileName>");
            log.WriteLine("Missing profile name argument");
            return;
        }

        string profileName = workerArgs[0];
        Console.WriteLine($"[Worker] Applying profile '{profileName}' from json_effects/{profileName}.json ...");
        log.WriteLine($"Invoking bridge for {profileName}");
        try
        {
            if (ApplyProfileByFilename(profileName))
            {
                Console.WriteLine("[Worker] SUCCESS: Dispatcher reported success. Check your keyboard and last_set_result.json.");
                log.WriteLine("Bridge returned true");
            }
            else
            {
                Console.Error.WriteLine("[Worker] ERROR: Bridge returned false. Inspect switch_profile_by_filename.log.");
                log.WriteLine("Bridge returned false");
            }
        }
        catch (DllNotFoundException ex)
        {
            Console.Error.WriteLine($"[Worker] ERROR: {ex.Message}");
            log.WriteLine(ex.ToString());
        }
        catch (Exception ex)
        {
            Console.Error.WriteLine($"[Worker] Exception: {ex.Message}");
            log.WriteLine(ex.ToString());
        }
    }
}
