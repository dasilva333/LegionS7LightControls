@echo off
setlocal
call "C:\Program Files\Microsoft Visual Studio\2022\Community\VC\Auxiliary\Build\vcvars64.bat"
pushd "%~dp0"
echo.
echo Building C++ Bridge in the correct directory: %CD%
echo.

:: Statically link the CRT (/MT) and add the required dbghelp.lib
cl /LD /EHa /MT EdgeProfileBridge.cpp /link Ole32.lib Shell32.lib dbghelp.lib

popd