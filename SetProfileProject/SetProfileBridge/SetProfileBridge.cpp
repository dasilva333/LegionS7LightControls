#include <windows.h>
#include <string>
#include <cstdio>
#include <cwchar>
#include <dbghelp.h>

#pragma comment(lib, "dbghelp.lib") // Link against the dbghelp library for crash dumps

// --- Status Codes ---
#define SUCCESS 1
#define FAILURE 0
#define ERR_LOAD_LIBRARY -1
#define ERR_GET_PROC_ADDRESS -2
#define ERR_SEH_EXCEPTION -3

// --- Function Pointers ---
using InitProfileFunc     = void (__cdecl*)(long long hw, unsigned int* detail, void* scratch, char* ctx);
using SetProfileIndexFunc = void (__cdecl*)(void* hw, long long* outStr, unsigned int* profileId, void* ctx);
using StringInitFunc      = void (__cdecl*)(long long* str, char fill);
using StringDestroyFunc   = void (__cdecl*)(long long* str);

struct VendorString {
    char _buf[16];
    size_t _size;
    size_t _alloc;
};

// --- Logger ---
static FILE* g_logFile = nullptr;
static void LogInit() {
    wchar_t dir[512];
    if (GetEnvironmentVariableW(L"LOCALAPPDATA", dir, 512)) {
        std::wstring folder = std::wstring(dir) + L"\\ProfileBridge";
        CreateDirectoryW(folder.c_str(), NULL);
        std::wstring file = folder + L"\\setter_dbg.log";
        _wfopen_s(&g_logFile, file.c_str(), L"w, ccs=UTF-8");
    }
}
static void Log(const wchar_t* fmt, ...) {
    if (!g_logFile) return;
    va_list args;
    va_start(args, fmt);
    vfwprintf(g_logFile, fmt, args);
    fflush(g_logFile);
    va_end(args);
}

// --- Crash Dump Handler ---
LONG WINAPI UnhandledExceptionHandler(EXCEPTION_POINTERS* ExceptionInfo)
{
    Log(L"FATAL: Unhandled SEH Exception caught. Writing crash dump...\n");
    wchar_t dir[512];
    if (GetEnvironmentVariableW(L"LOCALAPPDATA", dir, 512)) {
        std::wstring folder = std::wstring(dir) + L"\\ProfileBridge\\CrashDumps";
        CreateDirectoryW(folder.c_str(), NULL);
        std::wstring file = folder + L"\\crash.dmp";

        HANDLE hFile = CreateFileW(file.c_str(), GENERIC_WRITE, FILE_SHARE_READ, 0, CREATE_ALWAYS, FILE_ATTRIBUTE_NORMAL, 0);
        if (hFile != INVALID_HANDLE_VALUE) {
            MINIDUMP_EXCEPTION_INFORMATION exInfo;
            exInfo.ThreadId = GetCurrentThreadId();
            exInfo.ExceptionPointers = ExceptionInfo;
            exInfo.ClientPointers = FALSE;
            MiniDumpWriteDump(GetCurrentProcess(), GetCurrentProcessId(), hFile, MiniDumpNormal, &exInfo, NULL, NULL);
            CloseHandle(hFile);
            Log(L"Crash dump written to %s\n", file.c_str());
        }
    }
    return EXCEPTION_EXECUTE_HANDLER;
}

// --- Exported Function ---
extern "C" __declspec(dllexport) int SetProfileIndex(int profileId)
{
    LogInit();
    Log(L"--- SetProfileIndex Start ---\n");
    Log(L"Requested Profile ID: %d\n", profileId);

    // We will wrap the entire operation in a SEH block to generate a crash dump if it fails
    __try {
        SetDllDirectoryW(L"C:\\ProgramData\\Lenovo\\Vantage\\Addins\\LenovoGamingUserAddin\\1.3.1.34");
        HMODULE hModule = LoadLibraryW(L"Gaming.AdvancedLighting.dll");
        if (!hModule) { Log(L"Error: LoadLibraryW failed.\n"); return ERR_LOAD_LIBRARY; }
        Log(L"DLL loaded at 0x%p\n", hModule);

        uintptr_t base = (uintptr_t)hModule;
        void* hw = (void*)(base + 0x7E840);
        auto pInitProfile     = reinterpret_cast<InitProfileFunc>(base + 0x14630);
        auto pSetProfileIndex = reinterpret_cast<SetProfileIndexFunc>(base + 0x13650);
        auto pStringInit      = reinterpret_cast<StringInitFunc>(base + 0x17280);
        auto pStringDestroy   = reinterpret_cast<StringDestroyFunc>(base + 0x171b0);

        if (!pInitProfile || !pSetProfileIndex) { Log(L"Error: Failed to resolve function pointers.\n"); return ERR_GET_PROC_ADDRESS; }

        // Step 3A: Call the initializer
        Log(L"Calling Initializer (0x14630) to prepare state...\n");
        unsigned int detail_buffer[12] = {0};
        long long scratch_buffer[7] = {0};
        pInitProfile(reinterpret_cast<long long>(hw), detail_buffer, scratch_buffer, nullptr);
        Log(L"Initializer call complete.\n");
        
        // Step 3B: Wait for worker threads to finish
        Log(L"Waiting 200ms for worker threads...\n");
        Sleep(1000);

        // Step 3C: Now call SetProfileIndex
        unsigned int id = (unsigned int)profileId;
        VendorString outStr{};
        pStringInit(reinterpret_cast<long long*>(&outStr), '\0');

        Log(L"Calling SetProfileIndex worker (0x13650)...\n");
        pSetProfileIndex(hw, reinterpret_cast<long long*>(&outStr), &id, nullptr);

        pStringDestroy(reinterpret_cast<long long*>(&outStr));
        Log(L"Call to SetProfileIndex completed.\n");
    }
    __except (UnhandledExceptionHandler(GetExceptionInformation())) {
        Log(L"FATAL: Caught SEH Exception. See crash dump for details.\n");
        if (g_logFile) fclose(g_logFile);
        return ERR_SEH_EXCEPTION;
    }
    
    Log(L"--- SetProfileIndex End (SUCCESS) ---\n");
    if (g_logFile) fclose(g_logFile);
    return SUCCESS;
}
