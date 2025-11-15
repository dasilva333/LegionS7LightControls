using System;
using System.Globalization;
using System.Runtime.InteropServices;
using System.Text;

public class Program
{
    [DllImport("ProfileReader.dll", CallingConvention = CallingConvention.Cdecl)]
    public static extern bool TriggerWorker(long methodRva);

    public static void Main(string[] args)
    {
        Console.WriteLine("--- Hardware Object Memory Inspector ---");
        Console.WriteLine("Commands:");
        Console.WriteLine("  call <method_rva>   -- Calls a worker function to refresh state.");
        Console.WriteLine("  dump <offset> [size]-- Dumps memory from the hardware object.");
        Console.WriteLine("  exit");
        Console.WriteLine("\nExample: call 0x14110");
        Console.WriteLine("Example: dump 0x158 4");
        
        IntPtr hModule = IntPtr.Zero;
        IntPtr pHardwareObject = IntPtr.Zero;

        try
        {
            hModule = LoadLibrary(@"C:\ProgramData\Lenovo\Vantage\Addins\LenovoGamingUserAddin\1.3.1.34\Gaming.AdvancedLighting.dll");
            if (hModule == IntPtr.Zero) throw new Exception("Failed to load DLL.");
            
            pHardwareObject = new IntPtr(hModule.ToInt64() + 0x7E840);
            Console.WriteLine($"\nDLL loaded. Hardware object at 0x{pHardwareObject:X}. Ready for commands.");

            while (true)
            {
                Console.Write("\n> ");
                string? input = Console.ReadLine();
                if (string.IsNullOrEmpty(input) || input.Equals("exit", StringComparison.OrdinalIgnoreCase)) break;

                string[] parts = input.Split(' ', StringSplitOptions.RemoveEmptyEntries);
                if (parts.Length == 0) continue;

                try
                {
                    string command = parts[0].ToLower();
                    if (command == "call")
                    {
                        if (parts.Length != 2) { Console.WriteLine("Format: call <method_rva>"); continue; }
                        long rva = ParseHex(parts[1]);
                        Console.WriteLine($"Calling worker at RVA 0x{rva:X}...");
                        if (TriggerWorker(rva)) {
                            Console.WriteLine("Call completed successfully.");
                        } else {
                            Console.WriteLine("Call returned false or threw an exception.");
                        }
                    }
                    else if (command == "dump")
                    {
                        if (parts.Length < 2) { Console.WriteLine("Format: dump <offset> [size]"); continue; }
                        int offset = (int)ParseHex(parts[1]);
                        int size = (parts.Length > 2) ? (int)ParseHex(parts[2]) : 64; // Default to 64 bytes
                        
                        Console.WriteLine($"\nDumping {size} bytes from hardware object + 0x{offset:X}:");
                        byte[] data = new byte[size];
                        Marshal.Copy(pHardwareObject + offset, data, 0, size);

                        // Print in a classic hex dump format
                        for (int i = 0; i < data.Length; i += 16)
                        {
                            Console.Write($"0x{(offset + i):X4}: ");
                            for (int j = 0; j < 16; j++)
                            {
                                if (i + j < data.Length)
                                    Console.Write($"{data[i + j]:X2} ");
                                else
                                    Console.Write("   ");
                            }
                            Console.WriteLine();
                        }
                    }
                    else { Console.WriteLine("Unknown command."); }
                }
                catch (Exception ex) { Console.WriteLine($"Error: {ex.Message}"); }
            }
        }
        catch (Exception ex) { Console.Error.WriteLine($"\n--- FATAL ERROR ---\n{ex.Message}"); }
        finally { Environment.Exit(0); }
    }

    static long ParseHex(string hex) => long.Parse(hex.Replace("0x", ""), NumberStyles.HexNumber);
    [DllImport("kernel32.dll", SetLastError = true, CharSet = CharSet.Auto)]
    private static extern IntPtr LoadLibrary(string lpFileName);
}