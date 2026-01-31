@echo off
setlocal
call "C:\Program Files\Microsoft Visual Studio\2022\Community\VC\Auxiliary\Build\vcvars64.bat"
pushd "%~dp0"
echo.
echo Building DispatcherBridge.dll...
echo.

cl /LD /EHa /MT DispatcherBridge.cpp /FeDispatcherBridge.dll /link

popd