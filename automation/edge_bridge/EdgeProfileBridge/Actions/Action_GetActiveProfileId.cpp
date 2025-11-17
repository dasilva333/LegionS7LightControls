#include "Action_GetActiveProfileId.h"
#include "../Common/BridgeLog.h"
#include "../Common/NativeTypes.h"

namespace {
    // Helper function to contain the __try blocks, avoiding compiler error C2712.
    int perform_get_profile_id_native(HMODULE hModule, int* outId) {
        uintptr_t base = reinterpret_cast<uintptr_t>(hModule);
        void* hw = reinterpret_cast<void*>(base + 0x7E840);
        auto pInitProfile = reinterpret_cast<InitProfileDetail>(base + 0x14630);
        if (!pInitProfile) {
            Log(L"ERROR: pInitProfile function pointer is null.");
            return -2;
        }

        __try {
            unsigned int detail[12] = {};
            long long scratch[7] = {};
            pInitProfile(reinterpret_cast<long long>(hw), detail, scratch, nullptr);
        } __except (EXCEPTION_EXECUTE_HANDLER) {
            Log(L"ERROR: Exception caught in pInitProfile.");
            return -3;
        }

        auto pGetProfileIndex = reinterpret_cast<GetProfileIndexFunc>(base + 0x11210);
        if (!pGetProfileIndex) {
            Log(L"ERROR: pGetProfileIndex function pointer is null.");
            return -2;
        }

        __try { 
            pGetProfileIndex(hw); 
        } __except (EXCEPTION_EXECUTE_HANDLER) {
            Log(L"ERROR: Exception caught in pGetProfileIndex.");
            return -2;
        }
        
        *outId = *reinterpret_cast<int*>(reinterpret_cast<char*>(hw) + 0x154);
        return 1; // Success code
    }

} // End anonymous namespace

namespace Actions {
    int GetActiveProfileId() {
        Log(L"--- GetActiveProfileId STARTv2 ---");
        
        // THE FIX: Use SetDllDirectoryW, exactly like the working reference code.
        // This is the correct API to tell LoadLibrary where to find dependencies.
        if (!SetDllDirectoryW(kLenovoAddinPath)) {
            Log(L"ERROR: SetDllDirectoryW failed with error code %lu.", GetLastError());
        }
        
        HMODULE hModule = LoadLibraryW(L"C:\\ProgramData\\Lenovo\\Vantage\\Addins\\LenovoGamingUserAddin\\1.3.1.34\\Gaming.AdvancedLighting.dll");

        // Restore the default search path after loading.
        SetDllDirectoryW(NULL);

        if (!hModule) {
            Log(L"ERROR: LoadLibraryW failed with error code %lu.", GetLastError());
            return -1;
        }
        struct DllGuard { HMODULE h; ~DllGuard() { if (h) FreeLibrary(h); } } guard{hModule};

        // --- Perform the full, required initialization sequence ---
        using EntryFunc = BOOL (*)(HMODULE, DWORD, LPVOID);
        auto entry = reinterpret_cast<EntryFunc>(GetProcAddress(hModule, "entry"));
        if (!entry) {
            Log(L"ERROR: GetProcAddress for 'entry' failed.");
            return -2;
        }
        entry(hModule, 1, nullptr);

        using GetInstanceFunc = void* (*)();
        auto getInstance = reinterpret_cast<GetInstanceFunc>(GetProcAddress(hModule, "get_instance"));
        if (!getInstance) {
            Log(L"ERROR: GetProcAddress for 'get_instance' failed.");
            return -2;
        }
        getInstance();
        // --- End initialization sequence ---

        int currentId = 0;
        int result = perform_get_profile_id_native(hModule, &currentId);

        if (result < 0) {
            return result;
        }
        
        Log(L"SUCCESS: GetActiveProfileId finished with ID: %d", currentId);
        return currentId;
    }
}