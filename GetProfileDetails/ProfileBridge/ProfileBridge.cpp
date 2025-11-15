// Bridge for building profile JSON via Lenovo Gaming.AdvancedLighting.dll
// - Mirrors the working flow observed in FinalHarness
// - Initializes via 0x14630 (proper 4-arg init) before anything else
// - Builds JSON via 0x180054210 -> 0x180015ea0 (no SetProfileIndex)
// - Extracts vendor std::string (32 bytes) with SSO awareness
// - Logs steps to %LOCALAPPDATA%\ProfileBridge\dbg.log
// - Dumps raw JSON to %LOCALAPPDATA%\ProfileBridge\last.json

#include <windows.h>
#include <cstring>
#include <cstdio>
#include <cwchar>
#include <string>

// Helper: allocate CoTaskMem UTF-16 from UTF-8 bytes
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

// Minimal std::string layout used by vendor (32 bytes total)
struct VendorString {
    char   _buf[16];  // inline buffer (SSO) or pointer overlay
    size_t _size;     // length
    size_t _alloc;    // capacity
};

// Typedefs for resolved functions
using GetProfileIndexFunc = void (__cdecl*)(void*);
using InitProfileDetail   = void (__cdecl*)(long long /*hw*/, unsigned int* /*detail*/, void* /*scratch*/, char* /*ctx*/);
using BuildPrepFunc       = void (__cdecl*)(char* /*ctx8*/, int* /*detail*/, unsigned long long /*f1*/, unsigned long long /*f2*/);   // 0x180054210
using JsonWriteFunc       = void (__cdecl*)(char* /*ctx8*/, unsigned long long* /*outStr*/, int /*-1*/, char /*' '*/, char /*'\0'*/, unsigned int /*0*/); // 0x180015ea0

// Simple logger to %LOCALAPPDATA%\ProfileBridge\dbg.log
static void LogLine(const wchar_t* line)
{
    wchar_t dir[512];
    DWORD n = GetEnvironmentVariableW(L"LOCALAPPDATA", dir, 512);
    std::wstring folder = (n && n < 512) ? std::wstring(dir) : std::wstring(L"C:\\Users\\Public\\AppData");
    folder += L"\\ProfileBridge";
    CreateDirectoryW(folder.c_str(), NULL);
    std::wstring file = folder + L"\\dbg.log";
    FILE* f = nullptr;
    _wfopen_s(&f, file.c_str(), L"a, ccs=UTF-8");
    if (f) { fwprintf(f, L"%s\r\n", line); fclose(f); }
}

static void LogFmt(const wchar_t* fmt, unsigned long long a=0, unsigned long long b=0)
{
    wchar_t buf[512];
    _snwprintf_s(buf, _countof(buf), _TRUNCATE, fmt, a, b);
    LogLine(buf);
}

static void DumpBuf(const wchar_t* name, const void* p, size_t len)
{
    wchar_t dir[512];
    DWORD n = GetEnvironmentVariableW(L"LOCALAPPDATA", dir, 512);
    std::wstring folder = (n && n < 512) ? std::wstring(dir) : std::wstring(L"C:\\Users\\Public\\AppData");
    folder += L"\\ProfileBridge";
    CreateDirectoryW(folder.c_str(), NULL);
    std::wstring path = folder + L"\\" + name;
    FILE* f = nullptr;
    _wfopen_s(&f, path.c_str(), L"wb");
    if (f) { fwrite(p, 1, len, f); fclose(f); }
}

extern "C" __declspec(dllexport) const wchar_t* __cdecl GetProfileJson()
{
    // Ensure dependencies resolve like the vendor process
    SetDllDirectoryW(L"C:\\ProgramData\\Lenovo\\Vantage\\Addins\\LenovoGamingUserAddin\\1.3.1.34");

    HMODULE hModule = LoadLibraryW(L"C:\\ProgramData\\Lenovo\\Vantage\\Addins\\LenovoGamingUserAddin\\1.3.1.34\\Gaming.AdvancedLighting.dll");
    if (!hModule) return AllocCoTaskMemStringUtf8("{\"error\":\"load-library-failed\"}", 28);

    uintptr_t base = reinterpret_cast<uintptr_t>(hModule);
    void*     hw   = reinterpret_cast<void*>(base + 0x7E840);

    // Resolve needed functions
    auto pGetProfileIndex = reinterpret_cast<GetProfileIndexFunc>(base + 0x11210);
    auto pInitProfile     = reinterpret_cast<InitProfileDetail>(base + 0x14630);
    auto pBuildPrep       = reinterpret_cast<BuildPrepFunc>(base + 0x54210);
    auto pJsonWrite       = reinterpret_cast<JsonWriteFunc>(base + 0x15ea0);

    LogLine(L"GetProfileJson: start");
    LogFmt(L"base=0x%llx hw=0x%llx", (unsigned long long)base, (unsigned long long)hw);

    // 1) Initialize (proper 4-arg init) before anything else
    unsigned int detail[12] = {0};
    long long scratch[7] = {0};
    __try { LogLine(L"init_profile_detail(0x14630) [first]"); pInitProfile(reinterpret_cast<long long>(hw), detail, scratch, nullptr); }
    __except (EXCEPTION_EXECUTE_HANDLER) { LogLine(L"seh-init-profile"); return AllocCoTaskMemStringUtf8("{\"error\":\"seh-init-profile\"}", 31); }

    // Optional: dump a small hw slice for reference (0x100..0x200)
    DumpBuf(L"last_hw_after_first_init.bin", (const char*)hw + 0x100, 0x100);

    // 2) Get current id
    __try { LogLine(L"GetProfileIndex(0x11210)"); pGetProfileIndex(hw); }
    __except (EXCEPTION_EXECUTE_HANDLER) { LogLine(L"seh-get-profile-index"); return AllocCoTaskMemStringUtf8("{\"error\":\"seh-get-profile-index\"}", 33); }
    int currentId = *reinterpret_cast<int*>(reinterpret_cast<char*>(hw) + 0x154);
    LogFmt(L"currentId=%llu", (unsigned long long)currentId);

    // 3) Prepare vendor std::string for output (zero-init)
    VendorString outStr{};

    const wchar_t* ret = AllocCoTaskMemStringUtf8("{\"error\":\"native-exception\"}", 29);
    __try {
        struct BuilderCtx { char head[8]; long long tail; } ctx{};

        // 4) Prepare the builder context and emit JSON directly (BuildPrep -> JsonWrite)
        __try { LogLine(L"BuildPrep(0x180054210)"); pBuildPrep(reinterpret_cast<char*>(&ctx), reinterpret_cast<int*>(detail), 1ULL, 2ULL); }
        __except (EXCEPTION_EXECUTE_HANDLER) { LogLine(L"seh-build-prep"); return AllocCoTaskMemStringUtf8("{\"error\":\"seh-build-prep\"}", 28); }

        // Now write JSON to outStr
        __try { LogLine(L"JsonWrite(0x180015ea0)"); pJsonWrite(reinterpret_cast<char*>(&ctx), reinterpret_cast<unsigned long long*>(&outStr), -1, ' ', '\0', 0u); }
        __except (EXCEPTION_EXECUTE_HANDLER) { LogLine(L"seh-json-write"); return AllocCoTaskMemStringUtf8("{\"error\":\"seh-json-write\"}", 28); }

        // 5) Extract from vendor std::string (SSO aware)
        const char* data = nullptr;
        size_t len = outStr._size;
        LogFmt(L"vendor string len=%llu", (unsigned long long)len);
        if (len == 0) {
            ret = AllocCoTaskMemStringUtf8("{\"error\":\"empty-json\"}", 23);
        } else {
            bool sso = (len <= 15);
            LogLine(sso ? L"SSO=true" : L"SSO=false");
            if (sso) {
                data = outStr._buf;                 // inline
            } else {
                data = *reinterpret_cast<char* const*>(outStr._buf); // heap pointer in first 8 bytes
            }
            if (!data) {
                ret = AllocCoTaskMemStringUtf8("{\"error\":\"null-data\"}", 24);
            } else {
                DumpBuf(L"last.json", data, len);
                ret = AllocCoTaskMemStringUtf8(data, static_cast<int>(len));
            }
        }
    }
    __except (EXCEPTION_EXECUTE_HANDLER)
    {
        LogLine(L"seh-exception");
        ret = AllocCoTaskMemStringUtf8("{\"error\":\"seh-exception\"}", 25);
    }

    // Cleanup and finish (do not free vendor string buffer here)
    LogLine(L"GetProfileJson: end");
    return ret;
}
