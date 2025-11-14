#include <windows.h>
#include <string>
#include <vector>
#include <cwchar>
#include <cstdio>
#include <cstdlib>
#include <ctime>
#include <iomanip>
#include <sstream>
#include <dbghelp.h>
#include "json.hpp"

using json = nlohmann::json;

#pragma comment(lib, "dbghelp.lib")

using InitProfileFunc = void (__cdecl*)(long long hw, unsigned int* detail, void* scratch, char* ctx);
using VftableDispatcherFunc = void(__fastcall*)(void* thisPtr, std::string* outResult, std::string* inCommand, std::string* inPayload, void* ctx);

namespace
{
FILE* g_log = nullptr;

void EnsureLog()
{
    if (g_log) return;
    wchar_t dir[512];
    DWORD len = GetEnvironmentVariableW(L"LOCALAPPDATA", dir, 512);
    std::wstring folder = (len && len < 512) ? std::wstring(dir) : std::wstring(L"C:\\Users\\Public\\AppData");
    folder += L"\\ProfileBridge";
    CreateDirectoryW(folder.c_str(), nullptr);
    std::wstring path = folder + L"\\switch_profile_by_filename.log";
    _wfopen_s(&g_log, path.c_str(), L"a, ccs=UTF-8");
}

void Log(const wchar_t* fmt, ...)
{
    EnsureLog();
    if (!g_log) return;
    va_list args;
    va_start(args, fmt);
    vfwprintf(g_log, fmt, args);
    fwprintf(g_log, L"\n");
    fflush(g_log);
    va_end(args);
}

std::wstring GetProfileBridgeFolder()
{
    wchar_t dir[512];
    DWORD len = GetEnvironmentVariableW(L"LOCALAPPDATA", dir, 512);
    std::wstring folder = (len && len < 512) ? std::wstring(dir) : std::wstring(L"C:\\Users\\Public\\AppData");
    folder += L"\\ProfileBridge";
    CreateDirectoryW(folder.c_str(), nullptr);
    return folder;
}

std::wstring BuildEffectPath(const wchar_t* name)
{
    std::wstring result = L"C:\\Users\\h4rdc\\keyboard-led-project\\json_effects\\";
    result += name;
    result += L".json";
    return result;
}

bool ReadUtf8File(const std::wstring& path, std::string& out)
{
    FILE* file = nullptr;
    _wfopen_s(&file, path.c_str(), L"rb");
    if (!file) {
        Log(L"Failed to open %s", path.c_str());
        return false;
    }
    fseek(file, 0, SEEK_END);
    long size = ftell(file);
    fseek(file, 0, SEEK_SET);
    if (size < 0) {
        fclose(file);
        Log(L"ftell failed for %s", path.c_str());
        return false;
    }
    out.resize(static_cast<size_t>(size));
    if (size > 0) fread(&out[0], 1, static_cast<size_t>(size), file);
    fclose(file);
    return true;
}

std::string MakeCancelEvent(const std::string& command)
{
    static bool seeded = false;
    if (!seeded) {
        std::srand(static_cast<unsigned>(std::time(nullptr)));
        seeded = true;
    }
    std::ostringstream oss;
    oss << "Gaming.AdvancedLighting-" << command << "#";
    for (int i = 0; i < 32; ++i)
    {
        int value = std::rand() % 16;
        oss << std::hex << value;
    }
    return oss.str();
}

LONG WriteCrashDump(EXCEPTION_POINTERS* info)
{
    DWORD code = info && info->ExceptionRecord ? info->ExceptionRecord->ExceptionCode : 0;
    Log(L"SEH exception 0x%08lx captured", code);
    std::wstring folder = GetProfileBridgeFolder();
    std::wstring dumpPath = folder + L"\\switch_profile_by_filename_crash.dmp";
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
    }
    return EXCEPTION_EXECUTE_HANDLER;
}

bool InvokeDispatcherSafe(VftableDispatcherFunc dispatcher,
                          void* instance,
                          std::string* outResult,
                          std::string* inCommand,
                          std::string* inPayload)
{
    __try {
        dispatcher(instance, outResult, inCommand, inPayload, nullptr);
        return true;
    }
    __except(WriteCrashDump(GetExceptionInformation())) {
        return false;
    }
}
} // namespace

extern "C" __declspec(dllexport) bool ApplyProfileByFilename(const wchar_t* profileName);

std::wstring GetModuleDirectory()
{
    wchar_t modulePath[MAX_PATH] = {};
    HMODULE module = nullptr;
    if (GetModuleHandleExW(GET_MODULE_HANDLE_EX_FLAG_FROM_ADDRESS | GET_MODULE_HANDLE_EX_FLAG_UNCHANGED_REFCOUNT,
                           reinterpret_cast<LPCWSTR>(&ApplyProfileByFilename), &module))
    {
        GetModuleFileNameW(module, modulePath, MAX_PATH);
        std::wstring path(modulePath);
        size_t pos = path.find_last_of(L"\\/");
        if (pos != std::wstring::npos) {
            path.resize(pos);
        }
        return path;
    }
    return L".";
}

bool LoadCommandTemplate(std::string& outTemplate)
{
    std::wstring moduleDir = GetModuleDirectory();
    std::wstring templatePath = moduleDir + L"\\command_template.json";
    return ReadUtf8File(templatePath, outTemplate);
}

std::string EscapeJsonString(const std::string& input)
{
    std::string output;
    output.reserve(input.size() * 2);
    for (char c : input) {
        if (c == '"' || c == '\\') {
            output.push_back('\\');
        }
        output.push_back(c);
    }
    return output;
}

void ReplaceToken(std::string& target, const std::string& token, const std::string& value)
{
    size_t pos = 0;
    while ((pos = target.find(token, pos)) != std::string::npos) {
        target.replace(pos, token.length(), value);
        pos += value.length();
    }
}

extern "C" __declspec(dllexport) bool ApplyProfileByFilename(const wchar_t* profileName)
{
    Log(L"--- ApplyProfileByFilename begin ---");
    if (!profileName || wcslen(profileName) == 0) {
        Log(L"No profile name supplied");
        return false;
    }

    std::wstring effectPath = BuildEffectPath(profileName);
    std::string payloadRaw;
    if (!ReadUtf8File(effectPath, payloadRaw)) {
        Log(L"Unable to read %s", effectPath.c_str());
        return false;
    }
    Log(L"Loaded effect %s (%zu bytes)", effectPath.c_str(), payloadRaw.size());

    std::string minifiedPayload;
    try {
        minifiedPayload = json::parse(payloadRaw).dump();
    } catch (const std::exception& ex) {
        Log(L"JSON parse failed (%S)", ex.what());
        return false;
    }

    std::string commandTemplate;
    if (!LoadCommandTemplate(commandTemplate)) {
        Log(L"Failed to load command template");
        return false;
    }
    std::string commandJson = commandTemplate;
    ReplaceToken(commandJson, "__PAYLOAD__", EscapeJsonString(minifiedPayload));
    ReplaceToken(commandJson, "__CANCEL_EVENT__", MakeCancelEvent("Set-LightingProfileDetails"));

    std::string payloadTag = "write_log";

    HMODULE hModule = LoadLibraryW(L"C:\\ProgramData\\Lenovo\\Vantage\\Addins\\LenovoGamingUserAddin\\1.3.1.34\\Gaming.AdvancedLighting.dll");
    if (!hModule) {
        Log(L"Failed to load Gaming.AdvancedLighting.dll (%lu)", GetLastError());
        return false;
    }

    using EntryFunc = BOOL (*)(HMODULE, DWORD, LPVOID);
    if (auto entry = reinterpret_cast<EntryFunc>(GetProcAddress(hModule, "entry"))) {
        entry(hModule, 1, nullptr);
        Log(L"entry() invoked");
    }

    auto getInstance = reinterpret_cast<void* (*)()>(GetProcAddress(hModule, "get_instance"));
    if (!getInstance) {
        Log(L"get_instance missing");
        return false;
    }
    void* controller = getInstance();
    if (!controller) {
        Log(L"get_instance returned null");
        return false;
    }

    uintptr_t base = reinterpret_cast<uintptr_t>(hModule);
    auto initProfile = reinterpret_cast<InitProfileFunc>(base + 0x14630);
    if (!initProfile) {
        Log(L"init_profile_detail missing");
        return false;
    }

    unsigned int details[12] = {};
    long long scratch[7] = {};
    void* hw = reinterpret_cast<void*>(base + 0x7E840);
    initProfile(reinterpret_cast<long long>(hw), details, scratch, nullptr);
    Log(L"init_profile_detail invoked");

    void** vtable = *reinterpret_cast<void***>(controller);
    auto dispatcher = reinterpret_cast<VftableDispatcherFunc>(vtable[3]);
    if (!dispatcher) {
        Log(L"dispatcher slot3 null");
        return false;
    }

    std::string resultJson;
    Log(L"Dispatching Set-LightingProfileDetails for %s", profileName);
    if (!InvokeDispatcherSafe(dispatcher, controller, &resultJson, &commandJson, &payloadTag)) {
        Log(L"Dispatcher invocation failed");
        return false;
    }

    std::wstring folder = GetProfileBridgeFolder();
    std::wstring resultPath = folder + L"\\switch_profile_last_result.json";
    FILE* file = nullptr;
    _wfopen_s(&file, resultPath.c_str(), L"wb");
    if (file) {
        fwrite(resultJson.data(), 1, resultJson.size(), file);
        fclose(file);
        Log(L"Wrote dispatcher result to %s", resultPath.c_str());
    }

    Log(L"--- ApplyProfileByFilename end ---");
    return true;
}
