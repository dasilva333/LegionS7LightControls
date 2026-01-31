#include <windows.h>
#include <cstdint>

static HMODULE g_gamingModule = nullptr;

static HMODULE EnsureGamingModule()
{
    if (g_gamingModule) return g_gamingModule;
    const wchar_t* dllPath = L"C:\\ProgramData\\Lenovo\\Vantage\\Addins\\LenovoGamingUserAddin\\1.3.1.34\\Gaming.AdvancedLighting.dll";
    g_gamingModule = LoadLibraryW(dllPath);
    return g_gamingModule;
}

extern "C" __declspec(dllexport) int GetActiveProfileIdRaw()
{
    HMODULE hModule = EnsureGamingModule();
    if (!hModule)
    {
        return -1;
    }

    uintptr_t base = reinterpret_cast<uintptr_t>(hModule);
    uintptr_t hw = base + 0x7E840;
    uintptr_t profilePtr = hw + 0x154;
    auto getProfileIndex = reinterpret_cast<void(__cdecl*)(void*)>(base + 0x11210);
    if (getProfileIndex) {
        __try {
            getProfileIndex(reinterpret_cast<void*>(hw));
        }
        __except(EXCEPTION_EXECUTE_HANDLER) {
            return -3;
        }
    }

    __try
    {
        uint32_t profileId = *reinterpret_cast<uint32_t*>(profilePtr);
        return static_cast<int>(profileId);
    }
    __except(EXCEPTION_EXECUTE_HANDLER)
    {
        return -2;
    }
}

extern "C" __declspec(dllexport) void ShutdownEdgeBridge()
{
    if (g_gamingModule)
    {
        FreeLibrary(g_gamingModule);
        g_gamingModule = nullptr;
    }
}
