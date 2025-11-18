@echo off
setlocal
echo --- Building SwitchProfileBridge.dll ---

:: Set up the Visual Studio 64-bit compiler environment
call "C:\Program Files\Microsoft Visual Studio\2022\Community\VC\Auxiliary\Build\vcvars64.bat"

:: This is a direct translation of the command from your build_and_run_details.md
:: /LD = Build a DLL
:: /EHsc = Enable C++ exception handling (standard model)
:: /std:c++17 = Use the C++17 standard, which is required for json.hpp
echo Compiling...
cl /nologo /std:c++17 /LD SwitchProfileBridge.cpp /EHsc dbghelp.lib

:: Check for success and copy the DLL to the test project directory
if exist SwitchProfileBridge.dll (
    echo Build successful. Copying DLL to ..\SwitchProfileTest\
    copy SwitchProfileBridge.dll ..\SwitchProfileTest /y
    echo Copy complete.
) else (
    echo.
    echo !!! BUILD FAILED !!!
)

popd