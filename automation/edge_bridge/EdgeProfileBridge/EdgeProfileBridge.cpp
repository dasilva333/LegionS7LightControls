#include "StableCore.h"
#include "CrashableWorker.h"

// --- EXPORTED STABLE FUNCTIONS ---
// These functions simply forward the call to the StableCore module.

extern "C" __declspec(dllexport) int __cdecl GetActiveProfileIdRaw() {
    return StableCore::GetActiveProfileId();
}

extern "C" __declspec(dllexport) int __cdecl GetBrightnessRaw() {
    return StableCore::GetBrightness();
}

extern "C" __declspec(dllexport) const wchar_t* __cdecl GetProfileJsonRaw() {
    return StableCore::GetProfileJson();
}

extern "C" __declspec(dllexport) int __cdecl SetProfileIndexRaw(int profileId) {
    return StableCore::SetProfileIndex(profileId);
}

extern "C" __declspec(dllexport) void __cdecl ShutdownBridge() {
    StableCore::Shutdown();
}

// --- EXPORTED CRASHABLE FUNCTION ---
// This function forwards the call to the CrashableWorker module.

extern "C" __declspec(dllexport) bool __cdecl ExecuteDispatcherCommand(const wchar_t* commandJson, const wchar_t* payloadJson) {
    return CrashableWorker::ExecuteDispatcherCommand(commandJson, payloadJson);
}