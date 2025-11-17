@echo off
setlocal
call "C:\Program Files\Microsoft Visual Studio\2022\Community\VC\Auxiliary\Build\vcvars64.bat"
pushd "%~dp0"
echo.
echo Building C++ Bridge in the correct directory: %CD%
echo.

:: THE FIX: Use /Fe to force the output name to be EdgeProfileBridge.dll
cl /LD /EHa /MT *.cpp /FeEdgeProfileBridge.dll /link Ole32.lib Shell32.lib dbghelp.lib

popd