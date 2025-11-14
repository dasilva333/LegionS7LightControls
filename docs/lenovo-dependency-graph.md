============================================================

# **Lenovo Vantage – Dependency Graph (Excluding LED.dll)**

============================================================

The graph is presented in **five layers**, from top (UI) to bottom (system-level I/O).

```
======================================================
 LAYER 1: UI / Companion App (UWP / WinUI)
======================================================
```

### **Process**

* `LenovoVantage-(SmartColorAddin?).exe`
* `LenovoVantage-(IdeaKBDManagerAddin).exe`
* `LenovoVantage-(LenovoGamingSystemAddin).exe`
* etc.

These processes are spawned *per addin* and are thin clients that talk over RPC.

**Dependencies:**

* They load **only .NET wrappers**
* They do NOT load hardware DLLs directly
* They rely on the Vantage Service through RPC

**Outbound Relationship:**

```
UI Addin Executables
        │
        ▼
RPC Server in VantageService.exe
```

---

```
======================================================
 LAYER 2: Vantage Service (Dispatcher, Loader, Security)
======================================================
```

### **Main Process**

`C:\Program Files (x86)\Lenovo\VantageService\4.3.96.0\LenovoVantageService.exe`

### **Key Dependencies (Verified via Process Explorer)**

```
Lenovo.Vantage.RpcServer.dll
Lenovo.Vantage.RpcClient.dll
Lenovo.Vantage.RpcCommon.dll
Lenovo.Vantage.Service.Utilities.dll
Lenovo.Vantage.SetupUtility.dll
Lenovo.Vantage.ImClient.dll
Lenovo.Vantage.ConfigService.dll
Lenovo.ImController.Contracts.dll
Blake3.dll
ProcessTrace.dll
```

### **Critical Mechanisms**

* Enforcement of **TrustPid**
* Encrypted / validated message dispatch
* Loading of addins from ProgramData
* Host for RPC command handlers

**Outbound Relationship:**

```
VantageService.exe
        │ loads
        ▼
Addins from ProgramData\Lenovo\Vantage\Addins\*
```

---

```
======================================================
 LAYER 3: Add-in Layer (Managed Code, .NET)
======================================================
```

This is where **business logic** lives, for both gaming and keyboard modules.

### **Major Addins Identified**

(From actual ILSpy trees)

#### **3.1 LenovoGamingUserAddin**

`C:\ProgramData\Lenovo\Vantage\Addins\LenovoGamingUserAddin\1.3.1.34\`

Key DLLs:

```
LenovoGamingUserAddin.dll
Gaming.AdvancedLighting.dll
Gaming.MagicYKey.dll
Gaming.UserInfoMsg.dll
Gaming.GameUserCommon.dll
Gaming.Utilities.dll
AddinManager.dll
AddinInstaller.dll
```

#### **3.2 LenovoGamingSystemAddin**

`C:\ProgramData\Lenovo\Vantage\Addins\LenovoGamingSystemAddin\1.3.1.34\`

Key DLLs:

```
LenovoGamingSystemAddin.dll
Gaming.GameUserCommon.dll
Gaming.Utilities.dll
```

#### **3.3 IdeaNotebookAddin (Keyboard Backlight)**

`C:\ProgramData\Lenovo\Vantage\Addins\IdeaNotebookAddin\1.0.13.34\`

Key DLLs:

```
IdeaNotebookAddin.dll
KeyboardContract.dll
Lenovo.Modern.Contracts.Keyboard.dll
```

### **Key Behaviors**

* These DLLs implement **HandleRequest(...)** APIs
* They contain **pure .NET logic**
* They call into Lenovo’s **IKeyboard**, **IGaming**, **IBacklight**, etc.
* They call into lower layers via:

  * RPC responses
  * System call wrappers
  * Native PInvoke bridges (for hardware)

**Outbound Relationship:**

```
Managed Addin DLLs
        │ call
        ▼
Native Handler DLLs (DeviceIoControl / USB / HID / ACPI Layer)
```

---

```
======================================================
 LAYER 4: Native Wrapper Layer
======================================================
```

This is the layer where **the .NET addins cross into native code**.

The native modules we have actually seen so far:

### **Native CRT runtimes**

```
vcruntime140.dll
vcruntime140_1.dll
ucrtbase.dll
msvcp140.dll
```

### **Windows system DLLs**

(all confirmed loaded by Dependencies)

```
kernel32.dll
user32.dll
gdi32.dll
advapi32.dll
ole32.dll
oleaut32.dll
setupapi.dll
```

### **API Set Redirections**

(Dependency Walker shows these mapped)

```
api-ms-win-crt-runtime-l1-1-0.dll
api-ms-win-crt-string-l1-1-0.dll
api-ms-win-crt-math-l1-1-0.dll
api-ms-win-crt-heap-l1-1-0.dll
api-ms-win-crt-filesystem-l1-1-0.dll
api-ms-win-crt-locale-l1-1-0.dll
api-ms-win-crt-convert-l1-1-0.dll
```

### **Purpose of This Layer**

* Provide PInvoke entry points
* Wrap DeviceIoControl calls
* Handle HID / ACPI / WMI calls
* Forward to kernel drivers (**when present**)

These DLLs *do not* talk to hardware directly.
They rely on **kernel drivers**.

**Outbound Relationship:**

```
Native Helper DLLs
        │ call
        ▼
ACPI/WMI/HID driver stack
```

---

```
======================================================
 LAYER 5: Hardware Layer (Drivers)
======================================================
```

The elephant in the room:

### **There is no LED.sys, no per-device keyboard driver, no “RGB engine” driver anywhere in your system.**

This matches your independent research.

This reveals a critical truth:

> The RGB and backlight control system for your model is handled entirely through **standard HID/ACPI endpoints**, not a Lenovo custom driver.

In other words:

* Lenovo’s dlls send ACPI or HID feature reports
* The keyboard firmware executes them
* No custom driver = no vendor HAL controlling RGB

This matches modern Lenovo models that use:

* EC ACPI commands
* HID feature reports
* WMI hotkey channels

---

============================================================

# **Full Combined Graph (ASCII)**

============================================================

Here is the full dependency graph in one picture:

```
┌───────────────────────────────────────────────────────────────┐
│                  LAYER 1 - UI Addin EXEs                      │
│  LenovoVantage-(UserAddin).exe                                 │
│  LenovoVantage-(IdeaKBDManagerAddin).exe                       │
│  LenovoVantage-(GamingSystemAddin).exe                         │
└───────────────┬────────────────────────────────────────────────┘
                │ RPC (TrustedPid)
                ▼
┌───────────────────────────────────────────────────────────────┐
│           LAYER 2 - VantageService.exe (Dispatcher)           │
│ Loads addins, enforces security, passes requests via RPC       │
└───────────────┬────────────────────────────────────────────────┘
                │ Loads addin DLLs from ProgramData
                ▼
┌───────────────────────────────────────────────────────────────┐
│        LAYER 3 - Managed Addin DLLs (.NET logic)              │
│   LenovoGamingUserAddin, Gaming.AdvancedLighting,             │
│   IdeaNotebookAddin, KeyboardContract, IKeyboard, etc.        │
└───────────────┬────────────────────────────────────────────────┘
                │ PInvoke calls / DeviceIoControl wrappers
                ▼
┌───────────────────────────────────────────────────────────────┐
│        LAYER 4 - Native Runtime + Windows APIs                 │
│   vcruntime140.dll, msvcp140.dll, ucrtbase.dll, kernel32.dll  │
│   user32.dll, advapi32.dll, gdi32.dll, setupapi.dll           │
└───────────────┬────────────────────────────────────────────────┘
                │ ACPI / HID messages
                ▼
┌───────────────────────────────────────────────────────────────┐
│               LAYER 5 - Hardware (No vendor driver)           │
│   Keyboard EC firmware, HID feature reports, ACPI WMI         │
└───────────────────────────────────────────────────────────────┘
```

============================================================

# **What This Means For You**

============================================================

### **1. LED.dll being unused is completely consistent**

A leftover artifact used in old models or test rigs.

### **2. The true control path is:**

```
Addins → PInvoke → DeviceIoControl → ACPI/HID → Keyboard firmware
```

### **3. Hardware control is still possible**

Because the keyboard backlight accepts ACPI/HID commands, you can:

* Inject your own HID feature reports
* Bypass Vantage entirely
* Write your own RGB/lighting engine
* Build real-time animated effects
* Trigger based on notifications/time/weather
* Run scripts or services controlling lighting