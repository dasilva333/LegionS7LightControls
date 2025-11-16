#include "pch.h"

#include <windows.h>
#include <string>
#include <vector>
#include <cstdio>
#include <cstdint>
#include <cwchar>

#include "json.hpp"

using json = nlohmann::json;

using InitProfileFunc = void(__cdecl*)(long long hw, unsigned int* detail, void* scratch, char* ctx);
using DispatcherFunc = void(__fastcall*)(void*, std::string*, std::string*, std::string*, void*);

namespace
{
    FILE* gLog = nullptr;

    void EnsureLogOpen()
    {
        if (gLog) return;
        wchar_t path[MAX_PATH];
        DWORD len = GetEnvironmentVariableW(L"LOCALAPPDATA", path, MAX_PATH);
        std::wstring folder = (len && len < MAX_PATH) ? std::wstring(path) : std::wstring(L"C:\\Users\\Public\\AppData");
        folder += L"\\ProfileBridge";
        CreateDirectoryW(folder.c_str(), nullptr);
        std::wstring logPath = folder + L"\\edit_state.log";
        _wfopen_s(&gLog, logPath.c_str(), L"a, ccs=UTF-8");
    }

    void Log(const wchar_t* fmt, ...)
    {
        EnsureLogOpen();
        if (!gLog) return;
        va_list args;
        va_start(args, fmt);
        vfwprintf(gLog, fmt, args);
        fwprintf(gLog, L"\n");
        fflush(gLog);
        va_end(args);
    }

    std::wstring GetTrafficFolder()
    {
        wchar_t path[MAX_PATH];
        DWORD len = GetEnvironmentVariableW(L"LOCALAPPDATA", path, MAX_PATH);
        std::wstring base = (len && len < MAX_PATH) ? std::wstring(path) : std::wstring(L"C:\\Users\\Public\\AppData");
        base += L"\\Temp\\traffic";
        return base;
    }

    std::wstring GetBridgeFolder()
    {
        wchar_t path[MAX_PATH];
        DWORD len = GetEnvironmentVariableW(L"LOCALAPPDATA", path, MAX_PATH);
        std::wstring base = (len && len < MAX_PATH) ? std::wstring(path) : std::wstring(L"C:\\Users\\Public\\AppData");
        base += L"\\ProfileBridge";
        CreateDirectoryW(base.c_str(), nullptr);
        return base;
    }

    bool ReadWholeFile(const std::wstring& path, std::string& out)
    {
        FILE* f = nullptr;
        _wfopen_s(&f, path.c_str(), L"rb");
        if (!f) return false;
        fseek(f, 0, SEEK_END);
        long sz = ftell(f);
        fseek(f, 0, SEEK_SET);
        out.resize(static_cast<size_t>(sz));
        if (sz > 0)
            fread(&out[0], 1, static_cast<size_t>(sz), f);
        fclose(f);
        return true;
    }

    bool TryRead(const std::wstring& path, std::string& out)
    {
        DWORD attrs = GetFileAttributesW(path.c_str());
        if (attrs == INVALID_FILE_ATTRIBUTES) return false;
        return ReadWholeFile(path, out);
    }

    bool LoadCapturedCall(const std::wstring& timestamp,
                          std::string& command,
                          std::string& payload,
                          std::vector<uint8_t>& ctxBytes,
                          json& commandJson)
    {
        std::wstring traffic = GetTrafficFolder();
        std::wstring cmdBin = traffic + L"\\inbound_command_" + timestamp + L".binary";
        std::wstring cmdJson = traffic + L"\\inbound_command_" + timestamp + L".json";
        std::wstring payloadBin = traffic + L"\\inbound_payload_" + timestamp + L".binary";
        std::wstring payloadJson = traffic + L"\\inbound_payload_" + timestamp + L".json";
        std::wstring ctxBin = traffic + L"\\inbound_context_" + timestamp + L".binary";
        std::wstring ctxJson = traffic + L"\\inbound_context_" + timestamp + L".json";

        std::string temp;
        if (TryRead(cmdBin, temp))
        {
            command = temp;
            Log(L"Loaded command binary (%zu bytes)", command.size());
        }
        else if (ReadWholeFile(cmdJson, temp))
        {
            try
            {
                auto envelope = json::parse(temp);
                command = envelope.value("string_content", "");
                Log(L"Loaded command JSON fallback");
            }
            catch (const std::exception& ex)
            {
                Log(L"Failed to parse command envelope (%S)", ex.what());
                return false;
            }
        }
        else
        {
            Log(L"No command capture for %s", timestamp.c_str());
            return false;
        }

        try
        {
            commandJson = json::parse(command);
        }
        catch (const std::exception& ex)
        {
            Log(L"Command JSON parse error (%S)", ex.what());
            return false;
        }

        if (TryRead(payloadBin, temp))
        {
            payload = temp;
            Log(L"Loaded payload binary (%zu bytes)", payload.size());
        }
        else if (ReadWholeFile(payloadJson, temp))
        {
            try
            {
                auto envelope = json::parse(temp);
                payload = envelope.value("string_content", "");
                Log(L"Loaded payload JSON fallback");
            }
            catch (const std::exception& ex)
            {
                Log(L"Failed to parse payload envelope (%S)", ex.what());
            }
        }

        if (payload.empty())
        {
            payload = commandJson.value("payload", "");
            Log(L"Using payload from command JSON");
        }

        ctxBytes.clear();
        if (TryRead(ctxBin, temp))
        {
            ctxBytes.assign(temp.begin(), temp.end());
            Log(L"Loaded context binary (%zu bytes)", ctxBytes.size());
        }
        else if (ReadWholeFile(ctxJson, temp))
        {
            try
            {
                auto envelope = json::parse(temp);
                std::string str = envelope.value("string_content", "");
                ctxBytes.assign(str.begin(), str.end());
                if (!ctxBytes.empty()) Log(L"Loaded context textual (%zu bytes)", ctxBytes.size());
            }
            catch (const std::exception& ex)
            {
                Log(L"Ignoring context parse failure (%S)", ex.what());
            }
        }

        return true;
    }

}

extern "C" __declspec(dllexport) bool DispatchEditState(const wchar_t* timestamp)
{
    Log(L"--- DispatchEditState begin ---");
    if (!timestamp || !timestamp[0])
    {
        Log(L"No timestamp provided");
        return false;
    }

    HMODULE hModule = LoadLibraryW(L"C:\\ProgramData\\Lenovo\\Vantage\\Addins\\LenovoGamingUserAddin\\1.3.1.34\\Gaming.AdvancedLighting.dll");
    if (!hModule)
    {
        Log(L"LoadLibrary failed (%lu)", GetLastError());
        return false;
    }

    using EntryFunc = BOOL (*)(HMODULE, DWORD, LPVOID);
    EntryFunc entry = reinterpret_cast<EntryFunc>(GetProcAddress(hModule, "entry"));
    if (entry) entry(hModule, 1, nullptr);

    using GetInstanceFunc = void* (*)();
    auto getInstance = reinterpret_cast<GetInstanceFunc>(GetProcAddress(hModule, "get_instance"));
    if (!getInstance)
    {
        Log(L"get_instance missing");
        return false;
    }

    void* controller = getInstance();
    if (!controller)
    {
        Log(L"get_instance returned null");
        return false;
    }

    uintptr_t base = reinterpret_cast<uintptr_t>(hModule);
    auto initProfile = reinterpret_cast<InitProfileFunc>(base + 0x14630);
    void* hw = reinterpret_cast<void*>(base + 0x7E840);
    if (initProfile)
    {
        unsigned int detail[12] = {0};
        long long scratch[7] = {0};
        initProfile(reinterpret_cast<long long>(hw), detail, scratch, nullptr);
        Log(L"init_profile_detail invoked");
    }

    void** vtable = *reinterpret_cast<void***>(controller);
    auto dispatcher = reinterpret_cast<DispatcherFunc>(vtable[3]);
    if (!dispatcher)
    {
        Log(L"dispatcher slot missing");
        return false;
    }

    try
    {
        std::string commandBuffer;
        std::string payloadBuffer;
        std::vector<uint8_t> contextBytes;
        json commandJson;
        std::wstring ts(timestamp);
        if (!LoadCapturedCall(ts, commandBuffer, payloadBuffer, contextBytes, commandJson))
        {
            Log(L"Failed to load capture for %s", ts.c_str());
            return false;
        }

        std::string outBuffer;
        void* ctxPtr = contextBytes.empty() ? nullptr : contextBytes.data();
        Log(L"Dispatching %S [ts=%s ctx=%s]", commandJson.value("command", "<unknown>").c_str(), ts.c_str(), ctxPtr ? L"present" : L"null");
        dispatcher(controller, &outBuffer, &commandBuffer, &payloadBuffer, ctxPtr);

        std::wstring folder = GetBridgeFolder();
        std::wstring resultPath = folder + L"\\last_edit_state_result.json";
        FILE* f = nullptr;
        _wfopen_s(&f, resultPath.c_str(), L"wb");
        if (f)
        {
            fwrite(outBuffer.data(), 1, outBuffer.size(), f);
            fclose(f);
        }
        Log(L"Dispatcher completed (%zu bytes)", outBuffer.size());
    }
    catch (const std::exception& ex)
    {
        Log(L"Exception: %S", ex.what());
        return false;
    }
    catch (...)
    {
        Log(L"Unknown exception in DispatchEditState");
        return false;
    }

    Log(L"--- DispatchEditState end (success) ---");
    return true;
}
