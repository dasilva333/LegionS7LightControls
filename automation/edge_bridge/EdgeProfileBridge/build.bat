@echo off
call "C:\Program Files\Microsoft Visual Studio\2022\Community\VC\Auxiliary\Build\vcvars64.bat"
cl /LD /EHa EdgeProfileBridge.cpp /FeEdgeProfileBridge.dll /link Ole32.lib
