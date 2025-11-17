@echo off
echo Setting up C++ bridge directory structure...

:: Define the base directory for the bridge
set BRIDGE_DIR=automation\edge_bridge\EdgeProfileBridge

:: Create the main subdirectories
echo Creating directories...
mkdir "%BRIDGE_DIR%\Actions"
mkdir "%BRIDGE_DIR%\Common"

:: "touch" equivalent for Windows: Use 'type nul >' to create empty files
echo Creating empty source and header files...

:: Main hub file
type nul > "%BRIDGE_DIR%\EdgeProfileBridge.cpp"

:: Common module files
type nul > "%BRIDGE_DIR%\Common\BridgeLog.h"
type nul > "%BRIDGE_DIR%\Common\BridgeLog.cpp"
type nul > "%BRIDGE_DIR%\Common\NativeTypes.h"

:: Actions module files
type nul > "%BRIDGE_DIR%\Actions\Action_ExecuteDispatcher.h"
type nul > "%BRIDGE_DIR%\Actions\Action_ExecuteDispatcher.cpp"
type nul > "%BRIDGE_DIR%\Actions\Action_GetActiveProfileId.h"
type nul > "%BRIDGE_DIR%\Actions\Action_GetActiveProfileId.cpp"
type nul > "%BRIDGE_DIR%\Actions\Action_GetBrightness.h"
type nul > "%BRIDGE_DIR%\Actions\Action_GetBrightness.cpp"
type nul > "%BRIDGE_DIR%\Actions\Action_GetProfileJson.h"
type nul > "%BRIDGE_DIR%\Actions\Action_GetProfileJson.cpp"
type nul > "%BRIDGE_DIR%\Actions\Action_SetProfileIndex.h"
type nul > "%BRIDGE_DIR%\Actions\Action_SetProfileIndex.cpp"

echo.
echo Structure setup complete in %BRIDGE_DIR%
echo Please fill in the content for each file.

pause