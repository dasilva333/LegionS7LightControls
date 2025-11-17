@echo off
echo --- STARTING FULL AUTOMATION BUILD ---
rd /s /q automation\edge_bridge\EdgeWrapper\bin
rd /s /q automation\edge_bridge\EdgeWrapper\obj

echo.
echo [1/2] Building C++ Bridge...
call automation\edge_bridge\EdgeProfileBridge\build.bat
echo C++ Bridge build finished.
echo.

echo [2/2] Building C# Wrapper...
call automation\edge_bridge\EdgeWrapper\build.bat
echo C# Wrapper build finished.
echo.

echo --- FULL AUTOMATION BUILD COMPLETE ---