#pragma once
#include <windows.h>
#include <string>

// --- Function Pointer Types ---
using InitProfileDetail   = void (__cdecl*)(long long hw, unsigned int* detail, void* scratch, char* ctx);
using GetProfileIndexFunc = void (__cdecl*)(void* hw);
using GetBrightnessFunc   = void (__cdecl*)(void* hw);
using VftableDispatcherFunc = void(__fastcall*)(void* controller, void* outResult, void* inCommand, void* inPayload, void* ctx);
using JsonWriteFunc       = void (__cdecl*)(char* ctx8, unsigned long long* outStr, int neg1, char dash, char term, unsigned int zero);
using BuildPrepFunc       = void (__cdecl*)(char* ctx8, int* detail, unsigned long long f1, unsigned long long f2);
using SetProfileIndexFunc = void (__cdecl*)(void* hw, long long* vendorStr, unsigned int* profileId, void* ctx);
using StringInitFunc      = void (__cdecl*)(long long* str, char fill);
using StringDestroyFunc   = void (__cdecl*)(long long* str);

// --- Structs ---
struct VendorString { char _buf[16]; size_t _size; size_t _alloc; };

// --- Constants ---
static constexpr const wchar_t* kLenovoAddinPath =
    L"C:\\ProgramData\\Lenovo\\Vantage\\Addins\\LenovoGamingUserAddin\\1.3.1.34";