# Build and Paths

## Native (C++)

Visual Studio toolchain:
- x64 environment:
  - call "C:\\Program Files\\Microsoft Visual Studio\\2022\\Community\\VC\\Auxiliary\\Build\\vcvars64.bat"

Build:
- cd C:\\Users\\h4rdc\\keyboard-led-project\\ProfileReader
# Call / Dump Utility
- cl /LD /DUNICODE /D_UNICODE ProfileReader.cpp /EHsc Ole32.lib
# Profile JSON dump utility
- cl /LD /DUNICODE /D_UNICODE ProfileBridge.cpp /EHsc Ole32.lib && copy ProfileBridge.dll ..\GetProfileTest /y

- Check %LOCALAPPDATA%\ProfileBridge\dbg.log for: 
- 
## .NET (CLI Harness)

- Use explicit dotnet path:
  - "C:\\Program Files\\dotnet\\dotnet.exe"

FinalHarness_cli (non-interactive runner):
- dotnet build C:\\Users\\h4rdc\\keyboard-led-project\\FinalHarness_cli
- Examples:
  - dotnet run --project C:\\Users\\h4rdc\\keyboard-led-project\\FinalHarness_cli -- --BrightnessLevel
  - dotnet run --project C:\\Users\\h4rdc\\keyboard-led-project\\FinalHarness_cli -- --LightingProfileIndex
  - dotnet run --project C:\\Users\\h4rdc\\keyboard-led-project\\FinalHarness_cli -- --LightingProfileInfo 4


# set profile harness

C:\Users\h4rdc\keyboard-led-project\SetProfileProject\SetProfileBridge>cl /LD /DUNICODE /D_UNICODE SetProfileBridge.cpp /EHsc Ole32.lib && copy SetProfileBridge.dll ..\SetProfileTest /y

## Paths and DLL Resolution

- Target: C:\\ProgramData\\Lenovo\\Vantage\\Addins\\LenovoGamingUserAddin\\1.3.1.34\\Gaming.AdvancedLighting.dll
- Call SetDllDirectoryW to the folder above before LoadLibraryW.
- Copy ProfileReader.dll to FinalHarness_cli folder; P/Invoke uses absolute path to ensure the right DLL is loaded.

## Lock/Exit Issues

- If apphost is locked (FinalHarness.exe/FinalHarness_cli.exe), terminate processes via Task Manager or:
  - taskkill /F /IM FinalHarness.exe
  - taskkill /F /IM FinalHarness_cli.exe

- CLI harness forks a child process with a 6-second timeout to ensure termination.
