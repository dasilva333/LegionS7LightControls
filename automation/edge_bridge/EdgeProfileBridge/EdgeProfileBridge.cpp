#include "Actions/Action_GetActiveProfileId.h"
#include "Actions/Action_GetBrightness.h"
#include "Actions/Action_GetProfileJson.h"
#include "Actions/Action_SetProfileIndex.h"
#include "Actions/Action_ExecuteDispatcher.h"

// This block provides the clean C interface that the DLL exports.
extern "C" {
    __declspec(dllexport) int __cdecl GetActiveProfileIdRaw() {
        return Actions::GetActiveProfileId();
    }
    __declspec(dllexport) int __cdecl GetBrightnessRaw() {
        return Actions::GetBrightness(); // Stub
    }
    __declspec(dllexport) const wchar_t* __cdecl GetProfileJsonRaw() {
        return Actions::GetProfileJson(); // Stub
    }
    __declspec(dllexport) int __cdecl SetProfileIndexRaw(int profileId) {
        return Actions::SetProfileIndex(profileId); // Stub
    }
    __declspec(dllexport) bool __cdecl ExecuteDispatcherCommand(const wchar_t* commandJson, const wchar_t* payloadJson) {
        return Actions::ExecuteDispatcher(commandJson, payloadJson);
    }
    __declspec(dllexport) void __cdecl ShutdownBridge() {
        // No-op
    }
}