#include <windows.h>
#include <string>

// --- Function Pointers ---
// For Get-BrightnessLevel (RVA 0x14110)
using GetBrightnessFunc = int (__cdecl*)(void* hw);
// For Set-BrightnessLevel (RVA 0x14290)
using SetBrightnessFunc = void (__cdecl*)(void* hw, int brightness);

// Global Module Handle, loaded once to be efficient
HMODULE g_hModule = NULL;

// Helper to ensure the DLL is loaded and initialized
bool EnsureInitialized() {
    if (g_hModule) return true;
    
    // Set the directory so chained dependencies are found
    SetDllDirectoryW(L"C:\\ProgramData\\Lenovo\\Vantage\\Addins\\LenovoGamingUserAddin\\1.3.1.34");
    
    // Load the target DLL. The OS will automatically call its 'entry' function.
    g_hModule = LoadLibraryW(L"Gaming.AdvancedLighting.dll");
    
    return (g_hModule != NULL);
}

// --- Exported Functions for C# ---

extern "C" __declspec(dllexport) int GetBrightness()
{
    if (!EnsureInitialized()) return -99; // Return an improbable value on error
    
    uintptr_t base = (uintptr_t)g_hModule;
    void* hw = (void*)(base + 0x7E840);
    auto pGetBrightness = reinterpret_cast<GetBrightnessFunc>(base + 0x14110);
    
    int brightness = -1;
    __try {
        // Call the worker to refresh the cache in the hardware object
        pGetBrightness(hw);
        // Read the result directly from the known memory offset
        brightness = *(int*)((char*)hw + 0x158);
    } __except (EXCEPTION_EXECUTE_HANDLER) {
        brightness = -98; // Indicates a crash during the call
    }
    
    return brightness;
}

extern "C" __declspec(dllexport) bool SetBrightness(int brightness)
{
    if (!EnsureInitialized()) return false;
    
    uintptr_t base = (uintptr_t)g_hModule;
    void* hw = (void*)(base + 0x7E840);
    auto pSetBrightness = reinterpret_cast<SetBrightnessFunc>(base + 0x14290);
    
    __try {
        pSetBrightness(hw, brightness);
    } __except (EXCEPTION_EXECUTE_HANDLER) {
        return false; // The call crashed
    }
    
    return true; // Assume success if it didn't crash
}