using System;
using System.Diagnostics;
using System.IO;
using System.Reflection;
using System.Runtime.InteropServices;
using System.Text;
using System.Text.Json;

public class Program
{
    [DllImport(@"C:\\Users\\h4rdc\\keyboard-led-project\\FinalHarness_cli\\ProfileReader.dll", CharSet = CharSet.Unicode, CallingConvention = CallingConvention.Cdecl)]
    public static extern bool DispatchCommand(string command, string payload, StringBuilder outBuffer, int bufferSize);

    public static int Main(string[] args)
    {
        try
        {
            if (args.Length >= 1 && args[0] == "--child")
            {
                var (cmdC, payloadC) = MapFlagsToCommand(args[1..]);
                return RunChildOnce(cmdC, payloadC);
            }

            if (args.Length >= 1 && args[0].StartsWith("--", StringComparison.Ordinal))
            {
                var (cmd, payload) = MapFlagsToCommand(args);
                return SpawnChildAndWait(cmd, payload, TimeSpan.FromSeconds(6));
            }
            if (args.Length >= 1)
            {
                string command = args[0];
                string payload = args.Length >= 2 ? args[1] : "{}";
                return SpawnChildAndWait(command, payload, TimeSpan.FromSeconds(6));
            }
            Console.WriteLine("Usage: --BrightnessLevel | --LightingProfileIndex | --LightingProfileInfo <id> | <command> <payload>");
            return 0;
        }
        catch (Exception ex)
        {
            Console.Error.WriteLine(ex.ToString());
            return 2;
        }
    }

    private static int SpawnChildAndWait(string command, string payload, TimeSpan timeout)
    {
        string asm = Assembly.GetExecutingAssembly().Location;
        string dotnet = Environment.ProcessPath ?? "dotnet";
        var psi = new ProcessStartInfo
        {
            FileName = dotnet,
            Arguments = $"\"{asm}\" --child {EscapeArg(command)} {EscapeArg(payload)}",
            UseShellExecute = false,
            RedirectStandardOutput = true,
            RedirectStandardError = true,
            CreateNoWindow = true,
            WorkingDirectory = AppContext.BaseDirectory
        };
        using var p = Process.Start(psi)!;
        bool exited = p.WaitForExit((int)timeout.TotalMilliseconds);
        string stdout = p.StandardOutput.ReadToEnd();
        if (!string.IsNullOrWhiteSpace(stdout)) Console.Write(stdout);
        string stderr = p.StandardError.ReadToEnd();
        if (!string.IsNullOrWhiteSpace(stderr)) Console.Error.Write(stderr);
        if (!exited)
        {
            try { p.Kill(true); } catch { }
            Console.WriteLine(JsonSerializer.Serialize(new { error = "timeout", command }));
            return 3;
        }
        return p.ExitCode;
    }

    private static int RunChildOnce(string command, string payload)
    {
        try
        {
            var buffer = new StringBuilder(1024 * 64);
            bool ok = DispatchCommand(command, payload, buffer, buffer.Capacity);
            Console.WriteLine(buffer.ToString());
            return ok ? 0 : 1;
        }
        catch (Exception ex)
        {
            Console.WriteLine(JsonSerializer.Serialize(new { error = "invoke-exception", message = ex.Message }));
            return 2;
        }
    }

    private static (string cmd, string payload) MapFlagsToCommand(string[] args)
    {
        if (args.Length >= 1 && args[0].Equals("--BrightnessLevel", StringComparison.OrdinalIgnoreCase))
            return ("Get-BrightnessLevel", "{}");
        if (args.Length >= 1 && args[0].Equals("--LightingProfileIndex", StringComparison.OrdinalIgnoreCase))
            return ("Get-LightingProfileIndex", "{}");
        if (args.Length >= 1 && args[0].Equals("--LightingProfileInfo", StringComparison.OrdinalIgnoreCase))
        {
            if (args.Length >= 2 && int.TryParse(args[1], out var id))
            {
                var json = JsonSerializer.Serialize(new { profileId = id });
                return ("Get-LightingProfileInfo", json);
            }
            string p = args.Length >= 2 ? args[1] : "{}";
            return ("Get-LightingProfileInfo", p);
        }
        string c = args.Length >= 1 ? args[0] : string.Empty;
        string pl = args.Length >= 2 ? args[1] : "{}";
        return (c, pl);
    }

    private static string EscapeArg(string s)
    {
        if (string.IsNullOrEmpty(s)) return "\"\"";
        if (s.Contains(' ') || s.Contains('"')) return '"' + s.Replace("\"", "\\\"") + '"';
        return s;
    }
}
