#include <windows.h>
#include <string>
#include <cwchar>
#include <cwctype>
#include <cstdio>
#include <cstdlib>
#include <iomanip>
#include <sstream>
#include <ctime>
#include <cstdint>
#include <vector>
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

std::wstring GetProfileBridgeFolder()
{
    wchar_t dir[512];
    DWORD len = GetEnvironmentVariableW(L"LOCALAPPDATA", dir, 512);
    std::wstring folder = (len && len < 512) ? std::wstring(dir) : std::wstring(L"C:\\Users\\Public\\AppData");
    folder += L"\\ProfileBridge";
    CreateDirectoryW(folder.c_str(), nullptr);
    return folder;
}

std::wstring GetTrafficFolder()
{
    wchar_t dir[512];
    DWORD len = GetEnvironmentVariableW(L"LOCALAPPDATA", dir, 512);
    std::wstring folder = (len && len < 512) ? std::wstring(dir) : std::wstring(L"C:\\Users\\Public\\AppData");
    folder += L"\\Temp\\traffic";
    return folder;
}

bool ReadWholeFile(const std::wstring& path, std::string& outBuffer)
{
    FILE* file = nullptr;
    _wfopen_s(&file, path.c_str(), L"rb");
    if (!file) {
        Log(L"Failed to open file: %s", path.c_str());
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
    outBuffer.resize(static_cast<size_t>(size));
    if (size > 0) {
        fread(&outBuffer[0], 1, static_cast<size_t>(size), file);
    }
    fclose(file);
    return true;
}

bool TryReadWholeFile(const std::wstring& path, std::string& outBuffer)
{
    DWORD attrs = GetFileAttributesW(path.c_str());
    if (attrs == INVALID_FILE_ATTRIBUTES) {
        return false;
    }
    return ReadWholeFile(path, outBuffer);
}

bool WriteUtf8File(const std::wstring& path, const std::string& data)
{
    FILE* file = nullptr;
    _wfopen_s(&file, path.c_str(), L"wb");
    if (!file) {
        Log(L"Failed to open file for write: %s", path.c_str());
        return false;
    }
    if (!data.empty()) {
        fwrite(data.data(), 1, data.size(), file);
    }
    fclose(file);
    return true;
}

bool InvokeDispatcherSafe(VftableDispatcherFunc dispatcher,
                          void* controller,
                          std::string* outString,
                          std::string* inCommand,
                          std::string* inPayload,
                          const void* ctx)
{
    dispatcher(controller, outString, inCommand, inPayload, const_cast<void*>(ctx));
    return true;
}

bool LooksPrintable(const std::string& data)
{
    if (data.empty()) {
        return false;
    }
    for (unsigned char c : data) {
        if (c < 0x20 && c != '\n' && c != '\r' && c != '\t') {
            return false;
        }
    }
    return true;
}

std::vector<std::wstring> ParseTimestampList(const std::wstring& input)
{
    std::vector<std::wstring> result;
    std::wstring current;
    for (wchar_t ch : input) {
        if (ch == L',' || ch == L';' || iswspace(ch)) {
            if (!current.empty()) {
                result.push_back(current);
                current.clear();
            }
        } else {
            current.push_back(ch);
        }
    }
    if (!current.empty()) {
        result.push_back(current);
    }
    return result;
}

struct CapturedDispatch
{
    std::wstring timestamp;
    std::string commandJson;
    std::string payloadTag;
    std::vector<uint8_t> contextBytes;
    std::string commandName;
};

} // namespace

// Helper to safely convert C#'s wide string to a narrow UTF-8 string
std::string WStringToUtf8(const std::wstring& wstr) {
    if (wstr.empty()) return std::string();
    int size_needed = WideCharToMultiByte(CP_UTF8, 0, &wstr[0], (int)wstr.size(), NULL, 0, NULL, NULL);
    std::string strTo(size_needed, 0);
    WideCharToMultiByte(CP_UTF8, 0, &wstr[0], (int)wstr.size(), &strTo[0], size_needed, NULL, NULL);
    return strTo;
}

bool LoadCapturedCommand(const std::wstring& timestamp,
                         std::string& outCommandString,
                         std::string& outPayloadString,
                         std::vector<uint8_t>& outCtxBytes)
{
    std::wstring trafficDir = GetTrafficFolder();
    std::wstring commandPath = trafficDir + L"\\inbound_command_" + timestamp + L".json";
    std::wstring commandBinaryPath = trafficDir + L"\\inbound_command_" + timestamp + L".binary";
    std::wstring payloadPath = trafficDir + L"\\inbound_payload_" + timestamp + L".json";
    std::wstring payloadBinaryPath = trafficDir + L"\\inbound_payload_" + timestamp + L".binary";
    std::wstring contextPath = trafficDir + L"\\inbound_context_" + timestamp + L".json";
    std::wstring contextBinaryPath = trafficDir + L"\\inbound_context_" + timestamp + L".binary";

    std::string fileData;
    if (TryReadWholeFile(commandBinaryPath, fileData)) {
        outCommandString = fileData;
        Log(L"Loaded command binary (%zu bytes)", outCommandString.size());
    } else {
        if (!ReadWholeFile(commandPath, fileData)) {
            Log(L"Unable to read command envelope for timestamp %s", timestamp.c_str());
            return false;
        }

        try {
            auto commandEnvelope = json::parse(fileData);
            outCommandString = commandEnvelope.value("string_content", "");
            if (outCommandString.empty()) {
                Log(L"Command envelope missing string_content for %s", timestamp.c_str());
                return false;
            }
        } catch (const std::exception& ex) {
            Log(L"Failed to parse command envelope (%S)", ex.what());
            return false;
        }
    }

    std::string payloadData;
    json commandJson;
    try {
        commandJson = json::parse(outCommandString);
    } catch (const std::exception& ex) {
        Log(L"Failed to parse command JSON (%S)", ex.what());
        return false;
    }

    bool payloadFromCapture = false;
    if (TryReadWholeFile(payloadBinaryPath, payloadData)) {
        outPayloadString = payloadData;
        payloadFromCapture = true;
        Log(L"Loaded payload binary (%zu bytes)", outPayloadString.size());
    } else {
        if (ReadWholeFile(payloadPath, payloadData)) {
            try {
                auto payloadEnvelope = json::parse(payloadData);
                std::string capturedPayload = payloadEnvelope.value("string_content", "");
                if (!capturedPayload.empty()) {
                    outPayloadString = capturedPayload;
                    payloadFromCapture = true;
                    Log(L"Using payload from payload envelope");
                } else {
                    Log(L"Payload envelope for %s empty; will fall back to command JSON payload", timestamp.c_str());
                }
            } catch (const std::exception& ex) {
                Log(L"Ignoring payload envelope parse failure (%S)", ex.what());
            }
        } else {
            Log(L"No payload capture for %s", timestamp.c_str());
        }
    }

    if (!payloadFromCapture) {
        if (commandJson.contains("payload")) {
            outPayloadString = commandJson["payload"].get<std::string>();
            Log(L"Using payload embedded in command JSON");
        } else {
            outPayloadString.clear();
        }
    }

    // Read context if present
    outCtxBytes.clear();
    std::string ctxData;
    if (TryReadWholeFile(contextBinaryPath, ctxData)) {
        outCtxBytes.assign(ctxData.begin(), ctxData.end());
        Log(L"Loaded context binary (%zu bytes)", outCtxBytes.size());
    } else if (TryReadWholeFile(contextPath, ctxData)) {
        try {
            auto ctxEnvelope = json::parse(ctxData);
            std::string ctxString = ctxEnvelope.value("string_content", "");
            if (!ctxString.empty()) {
                outCtxBytes.assign(ctxString.begin(), ctxString.end());
                Log(L"Loaded context (%zu bytes)", outCtxBytes.size());
            }
        } catch (const std::exception& ex) {
            Log(L"Failed to parse context envelope (%S)", ex.what());
        }
    }

    return true;
}

// The single exported function for this bridge now replays a captured dispatcher call
extern "C" __declspec(dllexport) bool SetProfileJson(const wchar_t* captureTimestamp)
{
    Log(L"--- SetProfileJson begin ---");
    if (!captureTimestamp || captureTimestamp[0] == L'\0') {
        Log(L"No capture timestamp provided");
        return false;
    }
    std::wstring timelineInput(captureTimestamp);
    auto requestedTimestamps = ParseTimestampList(timelineInput);
    if (requestedTimestamps.empty()) {
        Log(L"Timeline input contained no usable timestamps: %s", timelineInput.c_str());
        return false;
    }
    Log(L"Requested capture timeline: %s", timelineInput.c_str());
    Log(L"Parsed %zu timestamp(s) to replay", requestedTimestamps.size());

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
        std::vector<CapturedDispatch> sequence;
        sequence.reserve(requestedTimestamps.size());
        for (const auto& ts : requestedTimestamps) {
            CapturedDispatch captured;
            captured.timestamp = ts;
            if (!LoadCapturedCommand(ts, captured.commandJson, captured.payloadTag, captured.contextBytes)) {
                Log(L"Failed to load captured command %s", ts.c_str());
                return false;
            }
            try {
                auto parsed = json::parse(captured.commandJson);
                captured.commandName = parsed.value("command", "<unknown>");
                Log(L"Queued %S @ %s", captured.commandName.c_str(), ts.c_str());
            } catch (const std::exception& ex) {
                captured.commandName = "<parse-error>";
                Log(L"Command JSON parse failure for %s (%S)", ts.c_str(), ex.what());
            }
            sequence.push_back(std::move(captured));
        }

        std::string outString;
        std::string lastResult;
        size_t order = 0;
        for (const auto& call : sequence) {
            ++order;
            std::string commandBuffer = call.commandJson;
            std::string payloadBuffer = call.payloadTag.empty() ? "write_log" : call.payloadTag;
            const void* ctxPtr = call.contextBytes.empty() ? nullptr : call.contextBytes.data();
            const char* label = call.commandName.empty() ? "<unknown>" : call.commandName.c_str();

            Log(L"Dispatching %S [order=%zu ts=%s ctx=%s]", label, order, call.timestamp.c_str(), ctxPtr ? L"present" : L"null");
            outString.clear();
            if (!InvokeDispatcherSafe(pDispatcher, pControllerObject, &outString, &commandBuffer, &payloadBuffer, ctxPtr)) {
                Log(L"Dispatch failed for %S @ %s", label, call.timestamp.c_str());
                return false;
            }

            lastResult = outString;
            if (LooksPrintable(outString)) {
                Log(L"Result (%zu bytes): %S", outString.size(), outString.c_str());
            } else {
                Log(L"Result length=%zu (binary)", outString.size());
            }
        }

        if (!lastResult.empty()) {
            std::string resultDump = lastResult;
            try {
                auto resultJson = json::parse(lastResult);
                resultDump = resultJson.dump(2);
            } catch (...) {
                // leave as raw string
            }
            std::wstring bridgeFolder = GetProfileBridgeFolder();
            std::wstring resultPath = bridgeFolder + L"\\last_set_result.json";
            WriteUtf8File(resultPath, resultDump);
            Log(L"Dispatcher returned response (%zu bytes) written to %s", resultDump.size(), resultPath.c_str());
        } else {
            Log(L"No dispatcher responses captured; nothing to write");
        }
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
