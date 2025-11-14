# **Lenovo Vantage Reverse-Engineering: File Path Inventory**

A complete list of every path confirmed in your screenshots or logs.

---

# **1. Add-ins Folder: Managed + Native DLLs**

These came from your directory listings and decompilation attempts.

### **1.1 LenovoGamingUserAddin (User Addin Layer)**

Path root:
`C:\ProgramData\Lenovo\Vantage\Addins\LenovoGamingUserAddin\1.3.1.34\`

Contents we confirmed:

```
AddinInstaller.dll  
AddinManager.dll  
arm64\
AutoLoadPluginTable.json  
Gaming.AdvancedLighting.dll  
Gaming.GameUserCommon.dll  
Gaming.Hardwareinfo.dll  
Gaming.MagicYKey.dll  
Gaming.Optimization.dll  
Gaming.UserInfoMsg.dll  
Gaming.Utilities.dll  
iTin.Core.dll  
iTin.Core.Hardware.dll  
iTin.Core.Hardware.Specification.Dmi.dll  
iTin.Core.Hardware.Specification.Smbios.dll  
iTin.Core.Hardware.Specification.Tpm.dll  
Lenovo.Vantage.AddinInterface.dll  
Lenovo.Vantage.RpcClient.dll  
Lenovo.Vantage.RpcCommon.dll  
Lenovo.VantageService.Utilities.dll  
LenovoGamingUserAddin.dll  
License.pdf  
PackageMetaData.xml  
System.Runtime.WindowsRuntime.dll  
ThirdPartyNotice.txt  
UserAddinInstallerHandle.dll  
VantageRpcClient.dll  
vcruntime140.dll  
vcruntime140_1.dll  
x64\  
x86\
```

These paths were directly verified in your screenshot.

---

### **1.2 LenovoGamingSystemAddin (System Addin Layer)**

Path root:
`C:\ProgramData\Lenovo\Vantage\Addins\LenovoGamingSystemAddin\1.3.1.34\`

DLLs we definitely saw here:

```
LED.dll      ← native (ILSpy cannot load)
```

(You said not to reference *analysis* about LED.dll, but listing its **path** is allowed.)

---

### **1.3 LenovoKeyboard Addins**

Path (from ILSpy assembly tree):

```
C:\ProgramData\Lenovo\Vantage\Addins\LenovoKeyboard (IdeaNotebookAddin)\1.0.13.34\
```

Referenced assemblies:

```
IdeaNotebookAddin.dll
KeyboardContract.dll
Lenovo.Modern.Contracts.Keyboard.dll
```

---

### **1.4 Additional Add-in Locations Identified by ILSpy Assembly Tree**

ILSpy showed assemblies loaded from:

```
C:\ProgramData\Lenovo\Vantage\Addins\LenovoKeyboardAddin\4.39.96.0\
C:\ProgramData\Lenovo\Vantage\Addins\LenovoGamingSystemAddin\4.39.96.0\
C:\ProgramData\Lenovo\Vantage\Addins\IdeaNotebookAddin\1.0.13.34\
```

(Exact subfolders inferred from tree view.)

---

# **2. Vantage Service Executables (Detected Via Process Explorer)**

The main service process:

```
C:\Program Files (x86)\Lenovo\VantageService\4.3.96.0\LenovoVantageService.exe
```

Loaded DLLs under that same folder:

```
C:\Program Files (x86)\Lenovo\VantageService\4.3.96.0\Lenovo.CertificateValidation.dll
C:\Program Files (x86)\Lenovo\VantageService\4.3.96.0\Lenovo.CertificateValidation.Native.dll
C:\Program Files (x86)\Lenovo\VantageService\4.3.96.0\Lenovo.ImController.Contracts.dll
C:\Program Files (x86)\Lenovo\VantageService\4.3.96.0\Lenovo.Vantage.ConfigService.dll
C:\Program Files (x86)\Lenovo\VantageService\4.3.96.0\Lenovo.Vantage.ImClient.dll
C:\Program Files (x86)\Lenovo\VantageService\4.3.96.0\Lenovo.Vantage.RpcClient.dll
C:\Program Files (x86)\Lenovo\VantageService\4.3.96.0\Lenovo.Vantage.RpcCommon.dll
C:\Program Files (x86)\Lenovo\VantageService\4.3.96.0\Lenovo.Vantage.RpcServer.dll
C:\Program Files (x86)\Lenovo\VantageService\4.3.96.0\Lenovo.Vantage.SetupUtility.dll
C:\Program Files (x86)\Lenovo\VantageService\4.3.96.0\Lenovo.VantageService.dll
C:\Program Files (x86)\Lenovo\VantageService\4.3.96.0\Lenovo.VantageService.Utilities.dll
```

Plus support binaries:

```
C:\Program Files (x86)\Lenovo\VantageService\4.3.96.0\BLAKE3.dll
C:\Program Files (x86)\Lenovo\VantageService\4.3.96.0\ProcessTrace.dll
```

---

# **3. System DLLs Loaded (From Dependencies View)**

These were auto-detected inside DLL dependency graphs:

### **Core Windows modules**

```
C:\WINDOWS\system32\kernel32.dll
C:\WINDOWS\system32\user32.dll
C:\WINDOWS\system32\gdi32.dll
C:\WINDOWS\system32\advapi32.dll
C:\WINDOWS\system32\ole32.dll
C:\WINDOWS\system32\oleaut32.dll
C:\WINDOWS\system32\setupapi.dll
```

### **CRT / VC Runtime**

```
C:\ProgramData\Lenovo\Vantage\Addins\LenovoGamingUserAddin\1.3.1.34\MSVCP140.dll
C:\ProgramData\Lenovo\Vantage\Addins\LenovoGamingUserAddin\1.3.1.34\VCRUNTIME140.dll
C:\ProgramData\Lenovo\Vantage\Addins\LenovoGamingUserAddin\1.3.1.34\VCRUNTIME140_1.dll

C:\WINDOWS\system32\ucrtbase.dll
```

### **API-set redirected DLLs**

(Seen in Dependencies as symlinked API entries)

```
api-ms-win-crt-runtime-l1-1-0.dll → ucrtbase.dll
api-ms-win-crt-string-l1-1-0.dll → ucrtbase.dll
api-ms-win-crt-heap-l1-1-0.dll → ucrtbase.dll
api-ms-win-crt-filesystem-l1-1-0.dll → ucrtbase.dll
api-ms-win-crt-math-l1-1-0.dll → ucrtbase.dll
api-ms-win-crt-convert-l1-1-0.dll → ucrtbase.dll
api-ms-win-crt-locale-l1-1-0.dll → ucrtbase.dll
```

---

# **4. Developer Tools Confirmed in Use**

### **4.1 ILSpy / ILSpyX**

You were using the **GUI version** of ILSpy, not the CLI.
The path was not logged, but the executable name shown in the titlebar:

```
ILSpyX
ILSpyX\LoadedAssembly.cs
ICSharpCode.ILSpyX
```

Meaning:

* You are using **ILSpyX**, a fork used by the “ILSpy for .NET Core” family.
* Typical location (not guaranteed):
  `C:\Users\h4rdc\Downloads\ILSpy\ILSpy.exe`
  or
  `C:\Users\h4rdc\AppData\Local\Programs\ILSpy\ILSpy.exe`

Since your logs did not reveal the absolute path, I am **not** inventing it.

---

### **4.2 Dependencies**

You launched the GUI version from:

```
C:\Users\h4rdc\Downloads\Dependencies_x64_Release\Dependencies.exe
```

This path was printed **exactly** by your console when you ran it.

---

# **5. Other Tools Mentioned but Not Yet Installed**

These were requested by you but not captured in logs:

* dumpbin.exe (ships with Visual Studio / Build Tools)
* strings.exe (Sysinternals or GNU binutils)
* depends.exe (Legacy Dependency Walker)

Since you haven’t run them yet, **no paths exist** for them.

---

# **6. Summary Table**

| Category                      | Path                                                                     |
| ----------------------------- | ------------------------------------------------------------------------ |
| Gaming User Addin             | `C:\ProgramData\Lenovo\Vantage\Addins\LenovoGamingUserAddin\1.3.1.34\`   |
| Gaming System Addin           | `C:\ProgramData\Lenovo\Vantage\Addins\LenovoGamingSystemAddin\1.3.1.34\` |
| Keyboard / IdeaNotebook Addin | `C:\ProgramData\Lenovo\Vantage\Addins\IdeaNotebookAddin\1.0.13.34\`      |
| Vantage Service               | `C:\Program Files (x86)\Lenovo\VantageService\4.3.96.0\`                 |
| Dependencies Tool             | `C:\Users\h4rdc\Downloads\Dependencies_x64_Release\Dependencies.exe`     |
| ILSpy                         | Path not logged, but tool confirmed in use                               |
