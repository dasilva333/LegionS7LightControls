#pragma once

// Declares the public API for the StableCore module.
namespace StableCore {
    int GetActiveProfileId();
    int GetBrightness();
    const wchar_t* GetProfileJson();
    int SetProfileIndex(int profileId);
    void Shutdown();
}