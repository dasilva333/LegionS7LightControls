#include <windows.h>
#include <cstdint>
#include <string>
#include <cwchar>
#include <cstdio>
#include <Shlobj.h>
#include "json.hpp"
#include "CrashableWorker.h"

#pragma comment(lib, "dbghelp.lib")

using json = nlohmann::json;

namespace {
    // Logging is also internal to this module
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
        EnsureLogOpen();
        if (!g_logFile) return;
        wchar_t timestamp[128];
        SYSTEMTIME st;
        GetLocalTime(&st);
        swprintf_s(timestamp, L"[%04d-%02d-%02d %02d:%02d:%02d.%03d] ", st.wYear, st.wMonth, st.wDay, st.wHour, st.wMinute, st.wSecond, st.wMilliseconds);
        fwprintf(g_logFile, L"%s", timestamp);
        va_list args;
        va_start(args, format);
        vfwprintf(g_logFile, format, args);
        va_end(args);
        fwprintf(g_logFile, L"\n");
        fflush(g_logFile);
    }

    using InitProfileDetail   = void (__cdecl*)(long long hw, unsigned int* detail, void* scratch, char* ctx);
    using VftableDispatcherFunc = void(__fastcall*)(void* controller, void* outResult, void* inCommand, void* inPayload, void* ctx);

    struct CurrentDirectoryGuard {
        wchar_t originalDir[MAX_PATH];
        CurrentDirectoryGuard(const wchar_t* newDir) { GetCurrentDirectoryW(MAX_PATH, originalDir); SetCurrentDirectoryW(newDir); }
        ~CurrentDirectoryGuard() { SetCurrentDirectoryW(originalDir); }
    };

    static constexpr const wchar_t* kLenovoAddinPath =
        L"C:\\ProgramData\\Lenovo\\Vantage\\Addins\\LenovoGamingUserAddin\\1.3.1.34";
    
    std::string WideToUtf8(const wchar_t* text) {
        if (!text) return {};
        int len = WideCharToMultiByte(CP_UTF8, 0, text, -1, nullptr, 0, nullptr, nullptr);
        if (len <= 0) return {};
        std::string buffer(len, '\0');
        WideCharToMultiByte(CP_UTF8, 0, text, -1, &buffer[0], len, nullptr, nullptr);
        if (!buffer.empty() && buffer.back() == '\0') buffer.pop_back();
        return buffer;
    }

    bool InvokeDispatcherSafe(VftableDispatcherFunc dispatcher, void* controller, std::string* outString, std::string* commandString, std::string* payloadString, const void* ctx) {
        __try { dispatcher(controller, outString, commandString, payloadString, const_cast<void*>(ctx)); return true; }
        __except (EXCEPTION_EXECUTE_HANDLER) { return false; }
    }

    bool SafeInitProfile(InitProfileDetail fn, void* hw, unsigned int* detail, long long* scratch) {
        __try { fn(reinterpret_cast<long long>(hw), detail, scratch, nullptr); return true; }
        __except (EXCEPTION_EXECUTE_HANDLER) { return false; }
    }

} // anonymous namespace

namespace CrashableWorker {
    bool ExecuteDispatcherCommand(const wchar_t* commandJson, const wchar_t* payloadJson) {
        Log(L"--- ExecuteDispatcherCommand START ---");
        CurrentDirectoryGuard dirGuard(kLenovoAddinPath);
        if (!commandJson || !payloadJson) { return false; }
        
        HMODULE hModule = LoadLibraryW(L"C:\\ProgramData\\Lenovo\\Vantage\\Addins\\LenovoGamingUserAddin\\1.3.1.34\\Gaming.AdvancedLighting.dll");
        if (!hModule) {
            Log(L"WORKER FATAL: LoadLibraryW failed with error %lu", GetLastError());
            return false;
        }
        struct DllGuard { HMODULE h; ~DllGuard() { if (h) FreeLibrary(h); } } guard{hModule};

        using EntryFunc = BOOL (*)(HMODULE, DWORD, LPVOID);
        auto entry = reinterpret_cast<EntryFunc>(GetProcAddress(hModule, "entry"));
        if (!entry) {
            Log(L"WORKER FATAL: GetProcAddress for 'entry' failed.");
            return false;
        }
        entry(hModule, 1, nullptr);

        using GetInstanceFunc = void* (*)();
        auto getInstance = reinterpret_cast<GetInstanceFunc>(GetProcAddress(hModule, "get_instance"));
        if (!getInstance) { return false; }
        void* controller = getInstance();
        if (!controller) { return false; }

        uintptr_t base = reinterpret_cast<uintptr_t>(hModule);
        void* hw = reinterpret_cast<void*>(base + 0x7E840);
        auto pInitProfile = reinterpret_cast<InitProfileDetail>(base + 0x14630);
        if (!pInitProfile) { return false; }
        
        unsigned int detail[12] = {};
        long long scratch[7] = {};
        if (!SafeInitProfile(pInitProfile, hw, detail, scratch)) { return false; }

        void** vftable = *reinterpret_cast<void***>(controller);
        if (!vftable) { return false; }
        VftableDispatcherFunc dispatcher = reinterpret_cast<VftableDispatcherFunc>(vftable[3]);
        if (!dispatcher) { return false; }

        std::string commandUtf8 = WideToUtf8(commandJson);
        std::string payloadUtf8 = WideToUtf8(payloadJson);
        if (commandUtf8.empty()) { return false; }
        
        std::string outResult;
        bool result = InvokeDispatcherSafe(dispatcher, controller, &outResult, &commandUtf8, &payloadUtf8, nullptr);
        Log(L"--- ExecuteDispatcherCommand END (Result: %s) ---", result ? L"true" : L"false");
        return result;
    }
}