#include <windows.h>
#include <string>
#include <cwchar>
#include <cstdio>
#include <Shlobj.h>
#include "json.hpp" // For correct static linking behavior

#pragma comment(lib, "dbghelp.lib") // Required by reference code

using json = nlohmann::json;

// --- Logging Infrastructure ---
namespace {
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
}

using InitProfileDetail   = void (__cdecl*)(long long hw, unsigned int* detail, void* scratch, char* ctx);
using VftableDispatcherFunc = void(__fastcall*)(void* controller, void* outResult, void* inCommand, void* inPayload, void* ctx);

// --- Utility Function Implementations ---
static std::string WideToUtf8(const wchar_t* text) {
    if (!text) return {};
    int len = WideCharToMultiByte(CP_UTF8, 0, text, -1, nullptr, 0, nullptr, nullptr);
    if (len <= 0) return {};
    std::string buffer(len, '\0');
    WideCharToMultiByte(CP_UTF8, 0, text, -1, &buffer[0], len, nullptr, nullptr);
    if (!buffer.empty() && buffer.back() == '\0') buffer.pop_back();
    return buffer;
}

static bool InvokeDispatcherSafe(VftableDispatcherFunc dispatcher, void* controller, std::string* outString, std::string* commandString, std::string* payloadString, const void* ctx) {
    __try {
        dispatcher(controller, outString, commandString, payloadString, const_cast<void*>(ctx));
        return true;
    }
    __except (EXCEPTION_EXECUTE_HANDLER) {
        return false;
    }
}

static bool SafeInitProfile(InitProfileDetail fn, void* hw, unsigned int* detail, long long* scratch) {
    __try {
        fn(reinterpret_cast<long long>(hw), detail, scratch, nullptr);
        return true;
    }
    __except (EXCEPTION_EXECUTE_HANDLER) {
        return false;
    }
}

// --- Exported Functions ---

extern "C" __declspec(dllexport) bool __cdecl SendRawTrafficRaw(const wchar_t* commandJson, const wchar_t* payloadJson) {
    Log(L"--- SendRawTrafficRaw START (Final Version) ---");

    if (!commandJson || !payloadJson) {
        Log(L"ERROR: commandJson or payloadJson is null.");
        return false;
    }

    const wchar_t* fullPath = L"C:\\ProgramData\\Lenovo\\Vantage\\Addins\\LenovoGamingUserAddin\\1.3.1.34\\Gaming.AdvancedLighting.dll";
    
    Log(L"Attempting to load library from absolute path: %s", fullPath);
    HMODULE hModule = LoadLibraryW(fullPath);
    if (!hModule) {
        Log(L"FATAL: LoadLibraryW failed with error %lu", GetLastError());
        return false;
    }
    Log(L"SUCCESS: LoadLibraryW handle: 0x%p", hModule);

    struct DllGuard {
        HMODULE h;
        ~DllGuard() { if (h) FreeLibrary(h); }
    } guard{hModule};

    Log(L"Getting address for 'entry'");
    using EntryFunc = BOOL (*)(HMODULE, DWORD, LPVOID);
    auto entry = reinterpret_cast<EntryFunc>(GetProcAddress(hModule, "entry"));
    if (!entry) {
        Log(L"FATAL: GetProcAddress for 'entry' failed.");
        return false;
    }
    Log(L"SUCCESS: Calling 'entry'");
    entry(hModule, 1, nullptr);

    Log(L"Getting address for 'get_instance'");
    using GetInstanceFunc = void* (*)();
    auto getInstance = reinterpret_cast<GetInstanceFunc>(GetProcAddress(hModule, "get_instance"));
    if (!getInstance) {
        Log(L"FATAL: GetProcAddress for 'get_instance' failed.");
        return false;
    }

    Log(L"Calling 'get_instance'");
    void* controller = getInstance();
    if (!controller) {
        Log(L"FATAL: 'get_instance' returned null.");
        return false;
    }
    Log(L"SUCCESS: Controller object at 0x%p", controller);

    uintptr_t base = reinterpret_cast<uintptr_t>(hModule);
    void* hw = reinterpret_cast<void*>(base + 0x7E840);
    auto pInitProfile = reinterpret_cast<InitProfileDetail>(base + 0x14630);
    Log(L"Preparing hardware state with hw=0x%p, pInitProfile=0x%p", hw, pInitProfile);
    if (!pInitProfile) {
        Log(L"FATAL: pInitProfile function pointer is null.");
        return false;
    }
    
    unsigned int detail[12] = {};
    long long scratch[7] = {};
    if (!SafeInitProfile(pInitProfile, hw, detail, scratch)) {
        Log(L"FATAL: SafeInitProfile call failed (crashed).");
        return false;
    }
    Log(L"SUCCESS: Hardware state initialized.");

    void** vftable = *reinterpret_cast<void***>(controller);
    if (!vftable) {
        Log(L"FATAL: Vftable is null.");
        return false;
    }
    Log(L"SUCCESS: Vftable at 0x%p", vftable);

    VftableDispatcherFunc dispatcher = reinterpret_cast<VftableDispatcherFunc>(vftable[3]);
    if (!dispatcher) {
        Log(L"FATAL: Dispatcher function at vftable[3] is null.");
        return false;
    }
    Log(L"SUCCESS: Dispatcher function at 0x%p", dispatcher);

    std::string commandUtf8 = WideToUtf8(commandJson);
    std::string payloadUtf8 = WideToUtf8(payloadJson);
    if (commandUtf8.empty()) {
        Log(L"FATAL: commandJson was empty after UTF-8 conversion.");
        return false;
    }
    
    std::string outResult;
    Log(L"Invoking dispatcher...");
    bool result = InvokeDispatcherSafe(dispatcher, controller, &outResult, &commandUtf8, &payloadUtf8, nullptr);
    Log(L"Dispatcher returned. Result: %s", result ? L"true" : L"false");

    Log(L"--- SendRawTrafficRaw END ---");
    return result;
}

extern "C" __declspec(dllexport) void __cdecl ShutdownBridge()
{
    Log(L"--- ShutdownBridge called (no-op) ---");
}