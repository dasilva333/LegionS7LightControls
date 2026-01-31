#include <windows.h>
#include <string>
#include <vector>
#include <cwchar>
#include <cstdio>
#include <cstdlib>
#include <ctime>
#include <iomanip>
#include <sstream>
#include "json.hpp"

using json = nlohmann::json;

// --- Helper to build the command envelope ---
std::string BuildCommandJson(const std::string& innerPayload) {
    // Generate a random 32-character hex string for the cancelEvent
    std::ostringstream cancelEventStream;
    cancelEventStream << "Gaming.AdvancedLighting-Set-LightingProfileDetails#";
    for (int i = 0; i < 32; ++i) {
        cancelEventStream << std::hex << (rand() % 16);
    }

    json commandObj;
    commandObj["callerPid"] = static_cast<int>(GetCurrentProcessId());
    commandObj["cancelEvent"] = cancelEventStream.str();
    commandObj["clientId"] = "Consumer";
    commandObj["command"] = "Set-LightingProfileDetails";
    commandObj["contract"] = "Gaming.AdvancedLighting";
    commandObj["payload"] = innerPayload; // The payload is the pre-stringified inner object
    commandObj["targetAddin"] = nullptr;

    return commandObj.dump();
}

// --- Function Pointer Types ---
using InitProfileFunc = void (__cdecl*)(long long hw, unsigned int* detail, void* scratch, char* ctx);
using VftableDispatcherFunc = void(__fastcall*)(void* thisPtr, std::string* outResult, std::string* inCommand, std::string* inPayload, void* ctx);

// --- The single exported function ---
extern "C" __declspec(dllexport) bool __cdecl InvokeFromInnerPayload(const wchar_t* innerPayloadW)
{
    if (!innerPayloadW) return false;

    // Convert wchar_t argument to std::string
    std::string innerPayload;
    int len = WideCharToMultiByte(CP_UTF8, 0, innerPayloadW, -1, nullptr, 0, nullptr, nullptr);
    if (len > 0) {
        innerPayload.resize(len - 1);
        WideCharToMultiByte(CP_UTF8, 0, innerPayloadW, -1, &innerPayload[0], len, nullptr, nullptr);
    }
    if (innerPayload.empty()) return false;

    HMODULE hModule = LoadLibraryW(L"C:\\ProgramData\\Lenovo\\Vantage\\Addins\\LenovoGamingUserAddin\\1.3.1.34\\Gaming.AdvancedLighting.dll");
    if (!hModule) return false;

    // --- Preamble ---
    using EntryFunc = BOOL (*)(HMODULE, DWORD, LPVOID);
    if (auto entry = reinterpret_cast<EntryFunc>(GetProcAddress(hModule, "entry"))) {
        entry(hModule, 1, nullptr);
    }

    auto getInstance = reinterpret_cast<void* (*)()>(GetProcAddress(hModule, "get_instance"));
    if (!getInstance) return false;
    void* controller = getInstance();
    if (!controller) return false;

    uintptr_t base = reinterpret_cast<uintptr_t>(hModule);
    auto initProfile = reinterpret_cast<InitProfileFunc>(base + 0x14630);
    if (!initProfile) return false;

    unsigned int details[12] = {};
    long long scratch[7] = {};
    void* hw = reinterpret_cast<void*>(base + 0x7E840);
    initProfile(reinterpret_cast<long long>(hw), details, scratch, nullptr);
    
    // --- Command Building (now happens inside C++) ---
    std::string finalCommandJson = BuildCommandJson(innerPayload);
    std::string payloadTag = "write_log";

    // --- Dispatch ---
    void** vtable = *reinterpret_cast<void***>(controller);
    auto dispatcher = reinterpret_cast<VftableDispatcherFunc>(vtable[3]);
    if (!dispatcher) return false;
    
    std::string resultJson;
    dispatcher(controller, &resultJson, &finalCommandJson, &payloadTag, nullptr);

    return true;
}