This screenshot gives us everything we needed.

# 🎯 **Root cause identified: `initProfile(...)` is throwing `std::exception` internally**

Look at your locals:

```
hw = Gaming.AdvancedLighting.dll
initProfile = Gaming.AdvancedLighting.dll!0x00007ffb?b2463...
```

That means:

### ✔ You successfully resolved the base pointer

### ✔ You successfully resolved the correct offset

### ✔ You successfully grabbed the real `initProfile` function

### ✔ The crash is happening **inside Lenovo’s function**, not yours

This is the key detail.

When you call:

```cpp
initProfile(reinterpret_cast<long long*>(hw), detail, scratch, nullptr);
```

Lenovo’s internal code is throwing a **std::exception**, which you can see because the debugger breaks *inside your call site*, not inside LenovoGaming dll (because it has no symbols).

---

# 📌 Why Lenovo’s `initProfile` is crashing

Your parameters:

```
detail = unsigned int[12] {0, 0, 0, ...}
scratch = long[7] {0, 0, 0, ...}
nullptr for 4th param
```

These are almost certainly **NOT** the values Lenovo expects.

This is a private function from a compiled C++ class inside LenovoGamingUserAddin.

That means:

It expects:

* **A valid Lenovo device handle**
* **Real HID / DXGI / driver state**
* **Real device context internals**
* **Actual data in scratch + detail arrays**
* **Not null pointers for certain cases**
* **Correct structure layout for each argument**

Right now you're giving it:

* A real object pointer (`hw`), good
* Two arrays full of zeroes (unknown if valid)
* A null pointer for the 4th parameter (very unlikely valid)

The function very likely does something like:

```cpp
if (param4 == nullptr)
    throw std::exception();
```

or

```cpp
auto dev = detail[0]; // if zero => throw
```

or it dereferences something invalid.

💡 **Since this is reverse-engineered, any missing expected object will cause a clean exception.**

---

# 🔍 Confirming: your exception is *not thrown by your code*

It is coming from:

```
Gaming.AdvancedLighting.dll!0x00007ffb?b246390
```

You even see in Autos:

```
initProfile = (void*)(...) Gaming.AdvancedLighting.dll
```

So the problem is:

### ✔ Lenovo's code is running

### ❌ but it does not like the parameters you supplied

---

# ✔ What you must do next (and I can walk you through it)

To call this internal function correctly, you need to reconstruct:

### 1. The correct signature

### 2. The correct structure layout (detail / scratch)

### 3. The meaning of the 4th parameter

### 4. Whether the object at `hw` must be initialized first

### 5. Whether you need to call earlier functions in the vtable before initProfile

Right now you are jumping directly to a mid-class method with uninitialized memory.

That almost always throws.

---

# 🎯 The next step

To find the correct calling convention and parameters, we must inspect that function in:

```
C:\ProgramData\Lenovo\Vantage\Addins\LenovoGamingUserAddin\1.3.1.34\Gaming.AdvancedLighting.dll
```

You need to:

### ✔ Open the DLL in Ghidra or IDA

### ✔ Go to offset `0x2463A0` (or the nearest function start)

### ✔ Look at:

* Number of arguments used
* Stack layout
* Access to detail/scratch
* Null checks before throw

---

# If you want, I can reverse it for you

Just give me:

### A small zipped copy of:

```
Gaming.AdvancedLighting.dll
Gaming.Utilities.dll
Gaming.AdvancedLighting.pdb (if exists, usually not)
```

Or upload only:

### the RVA of the function

### or a disassembly dump from Ghidra

Then I can reconstruct:

* The **exact prototype**
* The **expected parameter types**
* The **expected structure layout**
* Whether the method must be called after another initializer
* Whether the vtable object requires construction

---

# Summary of what you discovered

### ✔ Your DLL loads

### ✔ You resolved the correct function pointer

### ✔ The Lenovo DLL is reached

### ❌ The Lenovo function rejects your parameters and throws

This is good progress. You are now “inside the target.”

---