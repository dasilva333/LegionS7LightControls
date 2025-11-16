#include <windows.h>
#include <cstdint>
#include <cstring>
#include <cwchar>
#include <stdexcept>
#include <string>
#include <sstream>
#include <iomanip>

// Path where the Lenovo DLLs reside
static constexpr const wchar_t* kLenovoAddinPath =
    L"C:\\ProgramData\\Lenovo\\Vantage\\Addins\\LenovoGamingUserAddin\\1.3.1.34";

// Status codes
#define SUCCESS 1
#define ERR_INIT -1
#define ERR_PROC -2
#define ERR_CALL -3

// Global handle cached after the first initialization
static HMODULE g_hModule = nullptr;
static bool g_entryCalled = false;

// Helper that sets the DLL directory & loads the target module exactly once
static bool EnsureInitialized()
{
    if (g_hModule) return true;
    SetDllDirectoryW(kLenovoAddinPath);
    const wchar_t* dllPath = nullptr;
    if (GetModuleHandleW(L"Gaming.AdvancedLighting.dll"))
    {
        g_hModule = GetModuleHandleW(L"Gaming.AdvancedLighting.dll");
    }
    else
    {
        std::wstring fullPath(kLenovoAddinPath);
        fullPath += L"\\Gaming.AdvancedLighting.dll";
        g_hModule = LoadLibraryW(fullPath.c_str());
    }
    return (g_hModule != nullptr);
}

static void EnsureEntry()
{
    if (g_entryCalled || !g_hModule) return;
    using EntryFunc = BOOL (*)(HMODULE, DWORD, LPVOID);
    if (auto entry = reinterpret_cast<EntryFunc>(GetProcAddress(g_hModule, "entry"))) {
        entry(g_hModule, 1, nullptr);
    }
    g_entryCalled = true;
}

static void* CallGetInstance()
{
    if (!g_hModule) return nullptr;
    using GetInstanceFunc = void* (*)();
    auto getInstance = reinterpret_cast<GetInstanceFunc>(GetProcAddress(g_hModule, "get_instance"));
    if (!getInstance) return nullptr;
    return getInstance();
}

// Resolves the internal hardware object pointer (`hw`)
static void* ResolveHardwareObject()
{
    uintptr_t base = reinterpret_cast<uintptr_t>(g_hModule);
    return reinterpret_cast<void*>(base + 0x7E840);
}

// Function pointer types
using GetProfileIndexFunc = void (__cdecl*)(void*);
using GetBrightnessFunc = void (__cdecl*)(void*);
using InitProfileDetail   = void (__cdecl*)(long long hw, unsigned int* detail, void* scratch, char* ctx);
using SetProfileIndexFunc = void (__cdecl*)(void* hw, long long* vendorStr, unsigned int* profileId, void* ctx);
using StringInitFunc      = void (__cdecl*)(long long* str, char fill);
using StringDestroyFunc   = void (__cdecl*)(long long* str);
using BuildPrepFunc       = void (__cdecl*)(char* ctx8, int* detail, unsigned long long f1, unsigned long long f2);
using JsonWriteFunc       = void (__cdecl*)(char* ctx8, unsigned long long* outStr, int neg1, char dash, char term, unsigned int zero);
using VftableDispatcherFunc = void(__fastcall*)(void* controller, void* outResult, void* inCommand, void* inPayload, void* ctx);

// Vendor string layout (matches the std::string structure used by Lenovo)
struct VendorString {
    char   _buf[16];
    size_t _size;
    size_t _alloc;
};

static const wchar_t* AllocCoTaskMemStringUtf8(const char* utf8, int len)
{
    if (!utf8 || len <= 0) return nullptr;
    int needed = MultiByteToWideChar(CP_UTF8, 0, utf8, len, nullptr, 0);
    if (needed <= 0) return nullptr;
    wchar_t* buffer = static_cast<wchar_t*>(CoTaskMemAlloc((needed + 1) * sizeof(wchar_t)));
    if (!buffer) return nullptr;
    MultiByteToWideChar(CP_UTF8, 0, utf8, len, buffer, needed);
    buffer[needed] = L'\0';
    return buffer;
}

static const wchar_t* ErrorMessage(const char* message)
{
    return AllocCoTaskMemStringUtf8(message, static_cast<int>(strlen(message)));
}

static std::string WideToUtf8(const wchar_t* text)
{
    if (!text) return {};
    int len = WideCharToMultiByte(CP_UTF8, 0, text, -1, nullptr, 0, nullptr, nullptr);
    if (len <= 0) return {};
    std::string buffer(len, '\0');
    WideCharToMultiByte(CP_UTF8, 0, text, -1, &buffer[0], len, nullptr, nullptr);
    if (!buffer.empty() && buffer.back() == '\0') buffer.pop_back();
    return buffer;
}

static std::string EscapeJsonString(const std::string& value)
{
    std::ostringstream oss;
    for (unsigned char c : value) {
        switch (c) {
            case '\\': oss << "\\\\"; break;
            case '\"': oss << "\\\""; break;
            case '\b': oss << "\\b"; break;
            case '\f': oss << "\\f"; break;
            case '\n': oss << "\\n"; break;
            case '\r': oss << "\\r"; break;
            case '\t': oss << "\\t"; break;
            default:
                if (c < 0x20) {
                    oss << "\\u"
                        << std::hex << std::uppercase << std::setw(4) << std::setfill('0')
                        << static_cast<int>(c)
                        << std::dec;
                } else {
                    oss << c;
                }
        }
    }
    return oss.str();
}

static std::string BuildSetDetailsCommand(const std::string& payload)
{
    DWORD pid = GetCurrentProcessId();
    std::ostringstream oss;
    std::string escapedPayload = EscapeJsonString(payload);
    oss << "{\"contract\":\"Gaming.AdvancedLighting\",";
    oss << "\"command\":\"Set-LightingProfileDetails\",";
    oss << "\"payload\":\"" << escapedPayload << "\",";
    oss << "\"targetAddin\":null,";
    oss << "\"cancelEvent\":\"Gaming.AdvancedLighting-Set-LightingProfileDetails#"
        << std::hex << std::uppercase << pid << std::dec << "\",";
    oss << "\"clientId\":\"Consumer\",";
    oss << "\"callerPid\":" << pid << "}";
    return oss.str();
}

static bool InvokeDispatcherSafe(VftableDispatcherFunc dispatcher,
                                 void* controller,
                                 std::string* outString,
                                 std::string* commandString,
                                 std::string* payloadTag,
                                 const void* ctx)
{
    __try {
        dispatcher(controller, outString, commandString, payloadTag, const_cast<void*>(ctx));
        return true;
    }
    __except (EXCEPTION_EXECUTE_HANDLER) {
        return false;
    }
}

static bool SafeInitProfile(InitProfileDetail fn, void* hw, unsigned int* detail, long long* scratch)
{
    __try {
        fn(reinterpret_cast<long long>(hw), detail, scratch, nullptr);
        return true;
    }
    __except (EXCEPTION_EXECUTE_HANDLER) {
        return false;
    }
}

// Exposed exports
extern "C" __declspec(dllexport) bool __cdecl EnsureBridgeInitialized()
{
    return EnsureInitialized();
}

static bool PrepareHwState(void* hw)
{
    auto pInitProfile = reinterpret_cast<InitProfileDetail>(reinterpret_cast<uintptr_t>(g_hModule) + 0x14630);
    unsigned int detail[12] = {};
    long long scratch[7] = {};
    return pInitProfile && SafeInitProfile(pInitProfile, hw, detail, scratch);
}

extern "C" __declspec(dllexport) int __cdecl GetActiveProfileIdRaw()
{
    if (!EnsureInitialized()) return -1;
    EnsureEntry();
    CallGetInstance();
    void* hw = ResolveHardwareObject();
    if (!PrepareHwState(hw)) return -3;
    auto pGetProfileIndex = reinterpret_cast<GetProfileIndexFunc>(reinterpret_cast<uintptr_t>(g_hModule) + 0x11210);
    __try {
        pGetProfileIndex(hw);
    }
    __except (EXCEPTION_EXECUTE_HANDLER) {
        return -2;
    }
    int currentId = *reinterpret_cast<int*>(reinterpret_cast<char*>(hw) + 0x154);
    if (currentId == 0) {
        int alt = *reinterpret_cast<int*>(reinterpret_cast<char*>(hw) + 0x1A8);
        if (alt != 0) currentId = alt;
    }
    return currentId;
}

extern "C" __declspec(dllexport) int __cdecl GetBrightnessRaw()
{
    if (!EnsureInitialized()) return -1;
    EnsureEntry();
    CallGetInstance();
    void* hw = ResolveHardwareObject();
    if (!PrepareHwState(hw)) return -3;
    auto pGetBrightness = reinterpret_cast<GetBrightnessFunc>(reinterpret_cast<uintptr_t>(g_hModule) + 0x14110);
    __try {
        pGetBrightness(hw);
    }
    __except (EXCEPTION_EXECUTE_HANDLER) {
        return -2;
    }
    int brightness = *reinterpret_cast<int*>(reinterpret_cast<char*>(hw) + 0x158);
    return brightness;
}

extern "C" __declspec(dllexport) void __cdecl ShutdownEdgeBridge()
{
    if (g_hModule)
    {
        FreeLibrary(g_hModule);
        g_hModule = nullptr;
    }
}

extern "C" __declspec(dllexport) void __cdecl ShutdownBridge()
{
    ShutdownEdgeBridge();
}

extern "C" __declspec(dllexport) const wchar_t* __cdecl GetProfileJsonRaw()
{
    if (!EnsureInitialized()) return ErrorMessage("{\"error\":\"init_failed\"}");
    uintptr_t base = reinterpret_cast<uintptr_t>(g_hModule);
    EnsureEntry();
    void* hw = ResolveHardwareObject();

    auto pInitProfile = reinterpret_cast<InitProfileDetail>(base + 0x14630);
    auto pBuildPrep = reinterpret_cast<BuildPrepFunc>(base + 0x54210);
    auto pJsonWrite = reinterpret_cast<JsonWriteFunc>(base + 0x15ea0);
    auto pGetProfileIndex = reinterpret_cast<GetProfileIndexFunc>(base + 0x11210);

    unsigned int detail[12] = {};
    long long scratch[7] = {};

    __try {
        pInitProfile(reinterpret_cast<long long>(hw), detail, scratch, nullptr);
    }
    __except (EXCEPTION_EXECUTE_HANDLER) {
        return ErrorMessage("{\"error\":\"init_profile_failed\"}");
    }

    __try {
        if (pGetProfileIndex) pGetProfileIndex(hw);
    }
    __except (EXCEPTION_EXECUTE_HANDLER) {
        return ErrorMessage("{\"error\":\"get_profile_index_failed\"}");
    }

    VendorString outStr{};
    struct BuilderCtx { char head[8]; long long tail; } ctx{};

    __try {
        pBuildPrep(reinterpret_cast<char*>(&ctx), reinterpret_cast<int*>(detail), 1ULL, 2ULL);
    }
    __except (EXCEPTION_EXECUTE_HANDLER) {
        return ErrorMessage("{\"error\":\"build_prep_failed\"}");
    }

    __try {
        pJsonWrite(reinterpret_cast<char*>(&ctx), reinterpret_cast<unsigned long long*>(&outStr), -1, ' ', '\0', 0u);
    }
    __except (EXCEPTION_EXECUTE_HANDLER) {
        return ErrorMessage("{\"error\":\"json_write_failed\"}");
    }

    size_t len = outStr._size;
    if (len == 0) return ErrorMessage("{\"error\":\"empty_json\"}");

    const char* data = nullptr;
    if (len <= 15) {
        data = outStr._buf;
    } else {
        data = *reinterpret_cast<char* const*>(outStr._buf);
    }

    if (!data) return ErrorMessage("{\"error\":\"null_data\"}");
    return AllocCoTaskMemStringUtf8(data, static_cast<int>(len));
}

extern "C" __declspec(dllexport) int __cdecl SetProfileIndexRaw(int profileId)
{
    if (!EnsureInitialized()) return ERR_INIT;
    uintptr_t base = reinterpret_cast<uintptr_t>(g_hModule);
    void* hw = ResolveHardwareObject();

    auto pInitProfile = reinterpret_cast<InitProfileDetail>(base + 0x14630);
    auto pSetProfileIndex = reinterpret_cast<SetProfileIndexFunc>(base + 0x13650);
    auto pStringInit = reinterpret_cast<StringInitFunc>(base + 0x17280);
    auto pStringDestroy = reinterpret_cast<StringDestroyFunc>(base + 0x171b0);

    if (!pInitProfile || !pSetProfileIndex || !pStringInit || !pStringDestroy) {
        return ERR_PROC;
    }

    unsigned int detail[12] = {};
    long long scratch[7] = {};

    if (!SafeInitProfile(pInitProfile, hw, detail, scratch)) {
        return ERR_INIT;
    }

    VendorString outStr{};
    __try {
        pStringInit(reinterpret_cast<long long*>(&outStr), '\0');
        unsigned int id = static_cast<unsigned int>(profileId);
        pSetProfileIndex(hw, reinterpret_cast<long long*>(&outStr), &id, nullptr);
    }
    __except (EXCEPTION_EXECUTE_HANDLER) {
        pStringDestroy(reinterpret_cast<long long*>(&outStr));
        return ERR_CALL;
    }

    pStringDestroy(reinterpret_cast<long long*>(&outStr));
    Sleep(250);
    return SUCCESS;
}

extern "C" __declspec(dllexport) bool __cdecl SetProfileDetailsJsonRaw(const wchar_t* jsonPayload)
{
    if (!jsonPayload || jsonPayload[0] == L'\0') return false;
    std::string payload = WideToUtf8(jsonPayload);
    if (payload.empty()) return false;

    if (!EnsureInitialized()) return false;
    uintptr_t base = reinterpret_cast<uintptr_t>(g_hModule);
    void* hw = ResolveHardwareObject();

    using EntryFunc = BOOL (*)(HMODULE, DWORD, LPVOID);
    EntryFunc pEntry = reinterpret_cast<EntryFunc>(GetProcAddress(g_hModule, "entry"));
    if (pEntry) { pEntry(g_hModule, 1, nullptr); }

    using GetInstanceFunc = void* (*)();
    GetInstanceFunc pGetInstance = reinterpret_cast<GetInstanceFunc>(GetProcAddress(g_hModule, "get_instance"));
    if (!pGetInstance) return false;

    void* controller = pGetInstance();
    if (!controller) return false;

    auto pInitProfile = reinterpret_cast<InitProfileDetail>(base + 0x14630);
    if (!pInitProfile) return false;

    unsigned int detail[12] = {};
    long long scratch[7] = {};

    if (!SafeInitProfile(pInitProfile, hw, detail, scratch)) {
        return false;
    }

    void** vftable = *reinterpret_cast<void***>(controller);
    if (!vftable) return false;
    VftableDispatcherFunc dispatcher = reinterpret_cast<VftableDispatcherFunc>(vftable[3]);
    if (!dispatcher) return false;

    std::string commandJson = BuildSetDetailsCommand(payload);
    std::string payloadTag = "write_log";
    std::string outResult;

    return InvokeDispatcherSafe(dispatcher, controller, &outResult, &commandJson, &payloadTag, nullptr);
}

#define RawString(str) (str ? str : L"")
extern "C" __declspec(dllexport) bool __cdecl SendRawTrafficRaw(const wchar_t* commandJson)
{
    if (!commandJson || commandJson[0] == L'\0') return false;
    if (!EnsureInitialized()) return false;
    uintptr_t base = reinterpret_cast<uintptr_t>(g_hModule);
    EnsureEntry();
    void* controller = CallGetInstance();
    if (!controller) return false;

    std::string commandUtf8;
    {
        const wchar_t* src = commandJson;
        int len = WideCharToMultiByte(CP_UTF8, 0, src, -1, nullptr, 0, nullptr, nullptr);
        if (len <= 0) return false;
        commandUtf8.resize(len - 1);
        WideCharToMultiByte(CP_UTF8, 0, src, -1, &commandUtf8[0], len, nullptr, nullptr);
    }
    std::string payloadTag = "write_log";
    std::string outResult;

    void** vftable = *reinterpret_cast<void***>(controller);
    if (!vftable) return false;
    VftableDispatcherFunc dispatcher = reinterpret_cast<VftableDispatcherFunc>(vftable[3]);
    if (!dispatcher) return false;

    return InvokeDispatcherSafe(dispatcher, controller, &outResult, &commandUtf8, &payloadTag, nullptr);
}
