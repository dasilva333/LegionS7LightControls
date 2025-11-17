#include <windows.h>
#include <cstdint>
#include <string>
#include <cwchar>
#include <cstdio>
#include <Shlobj.h>
#include "json.hpp"
#include "StableCore.h"

#pragma comment(lib, "Ole32.lib")

using json = nlohmann::json;

namespace {
    // Logging is now internal to this module
    FILE* g_logFile = nullptr;
    void EnsureLogOpen() {
        if (g_logFile) return;
        wchar_t localAppData[MAX_PATH];
        if (SUCCEEDED(SHGetFolderPathW(NULL, CSIDL_LOCAL_APPDATA, NULL, 0, localAppData))) {
            std::wstring logFolderPath = std::wstring(localAppData) + L"\\ProfileBridge";
            CreateDirectoryW(logFolderPath.c_str(), NULL);
            std::wstring logFilePath = logFolderPath + L"\\EdgeBridge.log";
            _wfopen_s(&g_logFile, logFilePath.c_str(), L"a, ccs=UTF-8");
        }
    }
    void Log(const wchar_t* format, ...) {
        // --- Part 1: Write to the log file (existing behavior) ---
        EnsureLogOpen();
        if (g_logFile) {
            wchar_t timestamp[128];
            SYSTEMTIME st;
            GetLocalTime(&st);
            swprintf_s(timestamp, L"[%04d-%02d-%02d %02d:%02d:%02d.%03d] ", st.wYear, st.wMonth, st.wDay, st.wHour, st.wMinute, st.wSecond, st.wMilliseconds);
            fwprintf(g_logFile, L"%s", timestamp);
            
            va_list args_file;
            va_start(args_file, format);
            vfwprintf(g_logFile, format, args_file);
            va_end(args_file);
            
            fwprintf(g_logFile, L"\n");
            fflush(g_logFile);
        }

        // --- Part 2: Write to the console (new behavior) ---
        // We use wprintf to print wide characters to the console.
        // We prepend [C++ Bridge] to easily identify the source of the message.
        wprintf(L"[C++ Bridge] ");
        
        va_list args_console;
        va_start(args_console, format);
        vwprintf(format, args_console);
        va_end(args_console);
        
        wprintf(L"\n");
        fflush(stdout); // Ensure the console output is flushed immediately.
    }

    using InitProfileDetail   = void (__cdecl*)(long long hw, unsigned int* detail, void* scratch, char* ctx);
    using GetProfileIndexFunc = void (__cdecl*)(void* hw);
    using GetBrightnessFunc   = void (__cdecl*)(void* hw);
    using JsonWriteFunc       = void (__cdecl*)(char* ctx8, unsigned long long* outStr, int neg1, char dash, char term, unsigned int zero);
    using BuildPrepFunc       = void (__cdecl*)(char* ctx8, int* detail, unsigned long long f1, unsigned long long f2);
    using SetProfileIndexFunc = void (__cdecl*)(void* hw, long long* vendorStr, unsigned int* profileId, void* ctx);
    using StringInitFunc      = void (__cdecl*)(long long* str, char fill);
    using StringDestroyFunc   = void (__cdecl*)(long long* str);

    struct VendorString { char _buf[16]; size_t _size; size_t _alloc; };
    static constexpr const wchar_t* kLenovoAddinPath =
        L"C:\\ProgramData\\Lenovo\\Vantage\\Addins\\LenovoGamingUserAddin\\1.3.1.34";

    static HMODULE g_hModule = nullptr;

    bool EnsureInitialized() {
        if (g_hModule) return true;
        
        wchar_t originalDir[MAX_PATH] = { 0 };
        GetCurrentDirectoryW(MAX_PATH, originalDir);
        SetCurrentDirectoryW(kLenovoAddinPath);

        g_hModule = LoadLibraryW(L"C:\\ProgramData\\Lenovo\\Vantage\\Addins\\LenovoGamingUserAddin\\1.3.1.34\\Gaming.AdvancedLighting.dll");
        
        SetCurrentDirectoryW(originalDir);
        
        if (g_hModule) {
            using EntryFunc = BOOL (*)(HMODULE, DWORD, LPVOID);
            if (auto entry = reinterpret_cast<EntryFunc>(GetProcAddress(g_hModule, "entry"))) {
                entry(g_hModule, 1, nullptr);
            }
            
            // THE FIX IS HERE: The get_instance call is required for state initialization.
            using GetInstanceFunc = void* (*)();
            if (auto getInstance = reinterpret_cast<GetInstanceFunc>(GetProcAddress(g_hModule, "get_instance"))) {
                getInstance();
            }
        }
        return g_hModule != nullptr;
    }

    void* GetHardwareObject() {
        if (!g_hModule) return nullptr;
        return reinterpret_cast<void*>(reinterpret_cast<uintptr_t>(g_hModule) + 0x7E840);
    }
    
    // NOTE: This CallGetInstance is now redundant because the logic is inside EnsureInitialized.
    // I am leaving the function here but removing the calls to it from the exported functions below.
    void CallGetInstance() {
        if (!g_hModule) return;
        using GetInstanceFunc = void* (*)();
        auto getInstance = reinterpret_cast<GetInstanceFunc>(GetProcAddress(g_hModule, "get_instance"));
        if (getInstance) {
            getInstance();
        }
    }

    bool PrepareHardwareState(void* hw) {
        if (!g_hModule || !hw) return false;
        auto pInitProfile = reinterpret_cast<InitProfileDetail>(reinterpret_cast<uintptr_t>(g_hModule) + 0x14630);
        if (!pInitProfile) return false;
        
        __try {
            unsigned int detail[12] = {};
            long long scratch[7] = {};
            pInitProfile(reinterpret_cast<long long>(hw), detail, scratch, nullptr);
            return true;
        } __except (EXCEPTION_EXECUTE_HANDLER) {
            return false;
        }
    }

    const wchar_t* AllocCoTaskMemStringFromUtf8(const char* utf8, int len) {
        if (!utf8 || len <= 0) return nullptr;
        int needed = MultiByteToWideChar(CP_UTF8, 0, utf8, len, nullptr, 0);
        if (needed <= 0) return nullptr;
        wchar_t* buffer = static_cast<wchar_t*>(CoTaskMemAlloc((needed + 1) * sizeof(wchar_t)));
        if (!buffer) return nullptr;
        MultiByteToWideChar(CP_UTF8, 0, utf8, len, buffer, needed);
        buffer[needed] = L'\0';
        return buffer;
    }
}

namespace StableCore {
    int GetActiveProfileId() {
        Log(L"--- GetActiveProfileId START ---");
        if (!EnsureInitialized()) { 
            Log(L"ERROR: EnsureInitialized() failed.");
            return -1; // ERR_INIT
        }
        
        void* hw = GetHardwareObject();
        if (!hw) {
            Log(L"ERROR: GetHardwareObject() returned null.");
            return -2; // ERR_PROC
        }
        Log(L"Hardware object pointer: 0x%p", hw);

        if (!PrepareHardwareState(hw)) { 
            Log(L"ERROR: PrepareHardwareState() failed. This is the source of error -3.");
            return -3; // ERR_CALL
        }
        Log(L"SUCCESS: PrepareHardwareState() completed.");

        auto pGetProfileIndex = reinterpret_cast<GetProfileIndexFunc>(reinterpret_cast<uintptr_t>(g_hModule) + 0x11210);
        if (!pGetProfileIndex) { 
            Log(L"ERROR: GetProcAddress for GetProfileIndex failed.");
            return -2; // ERR_PROC
        }
        Log(L"GetProfileIndex function pointer: 0x%p", pGetProfileIndex);

        __try { 
            Log(L"Calling GetProfileIndex function...");
            pGetProfileIndex(hw); 
            Log(L"SUCCESS: GetProfileIndex function returned.");
        } __except (EXCEPTION_EXECUTE_HANDLER) { 
            Log(L"FATAL: Exception occurred during GetProfileIndex call.");
            return -2; // ERR_PROC
        }
        
        // This is the memory location where the profile ID is stored after the call.
        int* idPtr = reinterpret_cast<int*>(reinterpret_cast<char*>(hw) + 0x154);
        int currentId = *idPtr;

        Log(L"SUCCESS: Read active profile ID from memory (hw + 0x154). Value: %d", currentId);
        return currentId;
    }

    int GetBrightness() {
        Log(L"--- GetBrightnessRaw START ---");
        if (!EnsureInitialized()) { return -1; }
        // CallGetInstance(); <-- REMOVED
        void* hw = GetHardwareObject();
        if (!hw || !PrepareHardwareState(hw)) { return -3; }
        auto pGetBrightness = reinterpret_cast<GetBrightnessFunc>(reinterpret_cast<uintptr_t>(g_hModule) + 0x14110);
        if (!pGetBrightness) { return -2; }
        __try { pGetBrightness(hw); } __except (EXCEPTION_EXECUTE_HANDLER) { return -2; }
        int brightness = *reinterpret_cast<int*>(reinterpret_cast<char*>(hw) + 0x158);
        Log(L"SUCCESS: Brightness is %d", brightness);
        return brightness;
    }

    const wchar_t* GetProfileJson() {
        Log(L"--- GetProfileJsonRaw START ---");
        if (!EnsureInitialized()) return AllocCoTaskMemStringFromUtf8("{\"error\":\"init_failed\"}", -1);
        // CallGetInstance(); <-- REMOVED
        uintptr_t base = reinterpret_cast<uintptr_t>(g_hModule);
        void* hw = GetHardwareObject();
        auto pInitProfile = reinterpret_cast<InitProfileDetail>(base + 0x14630);
        auto pBuildPrep = reinterpret_cast<BuildPrepFunc>(base + 0x54210);
        auto pJsonWrite = reinterpret_cast<JsonWriteFunc>(base + 0x15ea0);
        if (!pInitProfile || !pBuildPrep || !pJsonWrite) return AllocCoTaskMemStringFromUtf8("{\"error\":\"proc_address_failed\"}", -1);
        if (!PrepareHardwareState(hw)) return AllocCoTaskMemStringFromUtf8("{\"error\":\"prepare_state_failed\"}", -1);
        
        unsigned int detail[12] = {};
        long long scratch[7] = {};
        pInitProfile(reinterpret_cast<long long>(hw), detail, scratch, nullptr);
        
        VendorString outStr{};
        struct BuilderCtx { char head[8]; long long tail; } ctx{};
        __try {
            pBuildPrep(reinterpret_cast<char*>(&ctx), reinterpret_cast<int*>(detail), 1ULL, 2ULL);
            pJsonWrite(reinterpret_cast<char*>(&ctx), reinterpret_cast<unsigned long long*>(&outStr), -1, ' ', '\0', 0u);
        } __except (EXCEPTION_EXECUTE_HANDLER) {
            return AllocCoTaskMemStringFromUtf8("{\"error\":\"json_build_exception\"}", -1);
        }
        size_t len = outStr._size;
        if (len == 0) return AllocCoTaskMemStringFromUtf8("{\"error\":\"empty_json\"}", -1);
        const char* data = (len <= 15) ? outStr._buf : *reinterpret_cast<char* const*>(outStr._buf);
        if (!data) return AllocCoTaskMemStringFromUtf8("{\"error\":\"null_data\"}", -1);
        Log(L"SUCCESS: GetProfileJsonRaw returning %zu bytes.", len);
        return AllocCoTaskMemStringFromUtf8(data, static_cast<int>(len));
    }

    int SetProfileIndex(int profileId) {
        Log(L"--- SetProfileIndexRaw START (ID: %d) ---", profileId);
        if (!EnsureInitialized()) return -1;
        // CallGetInstance(); <-- REMOVED
        uintptr_t base = reinterpret_cast<uintptr_t>(g_hModule);
        void* hw = GetHardwareObject();
        auto pInitProfile = reinterpret_cast<InitProfileDetail>(base + 0x14630);
        auto pSetProfileIndex = reinterpret_cast<SetProfileIndexFunc>(base + 0x13650);
        auto pStringInit = reinterpret_cast<StringInitFunc>(base + 0x17280);
        auto pStringDestroy = reinterpret_cast<StringDestroyFunc>(base + 0x171b0);
        if (!pInitProfile || !pSetProfileIndex || !pStringInit || !pStringDestroy) return -2;
        if (!PrepareHardwareState(hw)) return -1;
        VendorString outStr{};
        int result = 1;
        __try {
            pStringInit(reinterpret_cast<long long*>(&outStr), '\0');
            unsigned int id = static_cast<unsigned int>(profileId);
            pSetProfileIndex(hw, reinterpret_cast<long long*>(&outStr), &id, nullptr);
        } __except (EXCEPTION_EXECUTE_HANDLER) {
            result = -3;
        }
        pStringDestroy(reinterpret_cast<long long*>(&outStr));
        Log(L"SUCCESS: SetProfileIndexRaw finished with code %d", result);
        return result;
    }

    void Shutdown() {
        Log(L"--- ShutdownBridge START ---");
        if (g_hModule) {
            FreeLibrary(g_hModule);
            g_hModule = nullptr;
            Log(L"SUCCESS: StableCore module unloaded.");
        }
    }
}