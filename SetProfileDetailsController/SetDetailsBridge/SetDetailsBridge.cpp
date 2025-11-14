#include <windows.h>
#include <string>
#include <cwchar>
#include <cstdio>
#include <cstdlib>
#include <iomanip>
#include <sstream>
#include <ctime>
#include <cstdint>
#include <dbghelp.h>
#include "json.hpp" // Make sure you copy json.hpp into this folder

#pragma comment(lib, "dbghelp.lib")

using json = nlohmann::json;

// The CORRECT signature for the vftable method at index [3]
using InitProfileFunc = void (__cdecl*)(long long hw, unsigned int* detail, void* scratch, char* ctx);
using VftableDispatcherFunc = void(__fastcall*)(
    void* thisPtr,       // RCX
    void* outResult,     // RDX
    void* inCommand,     // R8
    void* inPayload,     // R9
    void* ctx);

namespace {

FILE* g_log = nullptr;
bool g_randSeeded = false;

void EnsureLogOpen()
{
    if (g_log) return;
    wchar_t dir[512];
    DWORD len = GetEnvironmentVariableW(L"LOCALAPPDATA", dir, 512);
    std::wstring folder = (len && len < 512) ? std::wstring(dir) : std::wstring(L"C:\\Users\\Public\\AppData");
    folder += L"\\ProfileBridge";
    CreateDirectoryW(folder.c_str(), nullptr);
    std::wstring path = folder + L"\\details_setter.log";
    _wfopen_s(&g_log, path.c_str(), L"a, ccs=UTF-8");
}

void Log(const wchar_t* fmt, ...)
{
    EnsureLogOpen();
    if (!g_log) return;
    va_list args;
    va_start(args, fmt);
    vfwprintf(g_log, fmt, args);
    fwprintf(g_log, L"\n");
    fflush(g_log);
    va_end(args);
}

LONG WriteCrashDump(EXCEPTION_POINTERS* info)
{
    DWORD code = info && info->ExceptionRecord ? info->ExceptionRecord->ExceptionCode : 0;
    Log(L"SEH exception 0x%08lx captured", code);
    wchar_t dir[512];
    DWORD len = GetEnvironmentVariableW(L"LOCALAPPDATA", dir, 512);
    std::wstring folder = (len && len < 512) ? std::wstring(dir) : std::wstring(L"C:\\Users\\Public\\AppData");
    folder += L"\\ProfileBridge";
    CreateDirectoryW(folder.c_str(), nullptr);
    std::wstring dumpPath = folder + L"\\details_setter_crash.dmp";
    HANDLE hFile = CreateFileW(dumpPath.c_str(), GENERIC_WRITE, 0, nullptr, CREATE_ALWAYS, FILE_ATTRIBUTE_NORMAL, nullptr);
    if (hFile != INVALID_HANDLE_VALUE) {
        MINIDUMP_EXCEPTION_INFORMATION dumpInfo{};
        dumpInfo.ThreadId = GetCurrentThreadId();
        dumpInfo.ExceptionPointers = info;
        dumpInfo.ClientPointers = FALSE;
        if (MiniDumpWriteDump(GetCurrentProcess(), GetCurrentProcessId(), hFile, MiniDumpNormal, &dumpInfo, nullptr, nullptr)) {
            Log(L"Crash dump written to %s", dumpPath.c_str());
        } else {
            Log(L"MiniDumpWriteDump failed (%lu)", GetLastError());
        }
        CloseHandle(hFile);
    } else {
        Log(L"CreateFile for dump failed (%lu)", GetLastError());
    }
    return EXCEPTION_EXECUTE_HANDLER;
}

bool InvokeDispatcherSafe(VftableDispatcherFunc dispatcher, void* controller, json* outJson, json* inCommand, json* inPayload, const char* ctx)
{
    __try {
        dispatcher(controller, outJson, inCommand, inPayload, const_cast<char*>(ctx));
        return true;
    }
    __except(WriteCrashDump(GetExceptionInformation())) {
        return false;
    }
}

} // namespace

// Helper to safely convert C#'s wide string to a narrow UTF-8 string
std::string WStringToUtf8(const std::wstring& wstr) {
    if (wstr.empty()) return std::string();
    int size_needed = WideCharToMultiByte(CP_UTF8, 0, &wstr[0], (int)wstr.size(), NULL, 0, NULL, NULL);
    std::string strTo(size_needed, 0);
    WideCharToMultiByte(CP_UTF8, 0, &wstr[0], (int)wstr.size(), &strTo[0], size_needed, NULL, NULL);
    return strTo;
}

// The single exported function for this bridge
extern "C" __declspec(dllexport) bool SetProfileJson(const wchar_t* profileJson)
{
    Log(L"--- SetProfileJson begin ---");
    HMODULE hModule = LoadLibraryW(L"C:\\ProgramData\\Lenovo\\Vantage\\Addins\\LenovoGamingUserAddin\\1.3.1.34\\Gaming.AdvancedLighting.dll");
    if (hModule == NULL) { Log(L"LoadLibrary failed (%lu)", GetLastError()); return false; }

    using EntryFunc = BOOL (*)(HMODULE, DWORD, LPVOID);
    EntryFunc pEntry = (EntryFunc)GetProcAddress(hModule, "entry");
    if (pEntry) { pEntry(hModule, 1, NULL); Log(L"entry() invoked"); }

    using GetInstanceFunc = void* (*)();
    GetInstanceFunc pGetInstance = (GetInstanceFunc)GetProcAddress(hModule, "get_instance");
    if (pGetInstance == NULL) { Log(L"get_instance missing"); return false; }

    void* pControllerObject = pGetInstance();
    if (pControllerObject == NULL) { Log(L"get_instance returned null"); return false; }

    uintptr_t base = reinterpret_cast<uintptr_t>(hModule);
    void* hw = reinterpret_cast<void*>(base + 0x7E840);
    auto pInitProfile = reinterpret_cast<InitProfileFunc>(base + 0x14630);
    if (!pInitProfile) { Log(L"init_profile_detail missing"); return false; }

    unsigned int detail_buffer[12] = {0};
    long long scratch_buffer[7] = {0};
    pInitProfile(reinterpret_cast<long long>(hw), detail_buffer, scratch_buffer, nullptr);
    Log(L"init_profile_detail invoked");

    void** pVftable = *(void***)pControllerObject;
    VftableDispatcherFunc pDispatcher = (VftableDispatcherFunc)pVftable[3];
    if (!pDispatcher) { Log(L"dispatcher slot3 null"); return false; }

    try
    {
        // --- THIS IS THE CRITICAL FIX ---
        // Create REAL nlohmann::json objects on the stack.
        json outJson;
        json inJsonCommand;
        json inJsonPayload;
        // ---------------------------------

        // 1. Prepare the 'inCommand' JSON object
        inJsonCommand["Command"] = "Set-LightingProfileDetails";
        // As the LLM noted, the dispatcher sometimes checks for a lowercase key too
        inJsonCommand["command"] = "Set-LightingProfileDetails";

        // 2. Prepare the 'inPayload' JSON object
        std::string payload_str = WStringToUtf8(profileJson);
        Log(L"Parsing payload JSON (%zu bytes)", payload_str.size());

        auto makeCancelEvent = [&](const std::string& cmd) {
            std::ostringstream oss;
            if (!g_randSeeded) {
                std::srand(static_cast<unsigned>(std::time(nullptr)));
                g_randSeeded = true;
            }
            oss << "Gaming.AdvancedLighting-" << cmd << "#" << std::hex << std::setw(32) << std::setfill('0') << std::uppercase << std::rand();
            return oss.str();
        };

        inJsonCommand["contract"] = "Gaming.AdvancedLighting";
        inJsonCommand["command"] = "Set-LightingProfileDetails";
        inJsonCommand["payload"] = payload_str;
        inJsonCommand["targetAddin"] = nullptr;
        inJsonCommand["cancelEvent"] = makeCancelEvent("Set-LightingProfileDetails");
        inJsonCommand["clientId"] = "Consumer";
        inJsonCommand["callerPid"] = static_cast<int>(GetCurrentProcessId());
        inJsonPayload = payload_str;
        Log(L"Command JSON prepared (contract + payload string)");
        
        Log(L"Dispatching command...");

        auto buildCommand = [&](const std::string& cmdName, const std::string& payloadValue) {
            json cmdJson;
            cmdJson["contract"] = "Gaming.AdvancedLighting";
            cmdJson["command"] = cmdName;
            cmdJson["payload"] = payloadValue;
            cmdJson["targetAddin"] = nullptr;
            cmdJson["cancelEvent"] = makeCancelEvent(cmdName);
            cmdJson["clientId"] = "Consumer";
            cmdJson["callerPid"] = static_cast<int>(GetCurrentProcessId());
            return cmdJson;
        };

        auto sendCommand = [&](const json& cmdJson, const std::string& payloadValue) {
            json payloadJson = payloadValue;
            json resultJson;
            return InvokeDispatcherSafe(pDispatcher, pControllerObject, &resultJson, const_cast<json*>(&cmdJson), &payloadJson, payloadValue.c_str());
        };

        json detailsCmd = buildCommand("Set-LightingProfileDetails", payload_str);
        if (!sendCommand(detailsCmd, payload_str)) {
            return false;
        }
        Log(L"Set-LightingProfileDetails succeeded; now toggling Set-ProfileEditState");

        json parsedPayload = json::parse(payload_str);
        int profileId = parsedPayload.value("profileId", 0);
        std::string editPayload = std::string("{\"layers\":[],\"profileId\":") + std::to_string(profileId) + "}";
        json editCmd = buildCommand("Set-ProfileEditState", editPayload);
        if (!sendCommand(editCmd, editPayload)) {
            Log(L"Set-ProfileEditState failed");
            return false;
        }
        Log(L"Dispatcher returned. Result keys: %zu", outJson.size());
    }
    catch (const std::exception& ex) {
        Log(L"Exception: %S", ex.what());
        return false;
    }
    catch (...) {
        Log(L"Unknown exception");
        return false;
    }
    
    Log(L"--- SetProfileJson end (success) ---");
    
    return true;
}
