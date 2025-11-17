#include "BridgeLog.h"
#include <string>
#include <cstdio>
#include <Shlobj.h>

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
}

void Log(const wchar_t* format, ...) {
    // File logging
    EnsureLogOpen();
    if (g_logFile) {
        wchar_t timestamp[128];
        SYSTEMTIME st;
        GetLocalTime(&st);
        swprintf_s(timestamp, L"[%04d-%02d-%02d %02d:%02d:%02d.%03d] ", st.wYear, st.wMonth, st.wDay, st.wHour, st.wMinute, st.wSecond, st.wMilliseconds);
        fwprintf(g_logFile, L"%s", timestamp);
        va_list args_file;
        va_start(args_file, format);
        vfwprintf(g_logFile, format, args_file);
        va_end(args_file);
        fwprintf(g_logFile, L"\n");
        fflush(g_logFile);
    }
    // Console logging
    wprintf(L"[C++ Bridge] ");
    va_list args_console;
    va_start(args_console, format);
    vwprintf(format, args_console);
    va_end(args_console);
    wprintf(L"\n");
    fflush(stdout);
}