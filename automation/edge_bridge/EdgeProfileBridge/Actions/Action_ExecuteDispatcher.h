// In Actions\Action_ExecuteDispatcher.h
#pragma once
#include <windows.h>

namespace Actions {
    bool ExecuteDispatcher(const wchar_t* commandJson, const wchar_t* payloadJson);
}