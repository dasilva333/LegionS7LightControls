@echo off
setlocal
call "C:\Program Files\Microsoft Visual Studio\2022\Community\VC\Auxiliary\Build\vcvars64.bat"
pushd "%~dp0"
echo.
echo Building C++ Bridge Modules...
echo.

:: THE FIX: Compile the main hub and all .cpp files in the subdirectories.
cl /LD /EHa /MT EdgeProfileBridge.cpp Common\*.cpp Actions\*.cpp /FeEdgeProfileBridge.dll /link Ole32.lib Shell32.lib dbghelp.lib

popd