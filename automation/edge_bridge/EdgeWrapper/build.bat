@echo off
echo.
echo Building C# Wrapper for x64...
echo.

:: --- Pass 1: Build the EdgeProfileWrapper.dll ---
echo [1/2] Building the Stable API DLL...
dotnet build "%~dp0EdgeWrapper.csproj" -p:Platform=x64
echo.

:: --- Pass 2: Build the EdgeProfileWorker.exe ---
echo [2/2] Building the Crashable Worker EXE...
dotnet build "%~dp0EdgeWrapper.csproj" -p:Platform=x64 -p:IsWorkerBuild=true
echo.

echo C# Wrapper build complete. Both artifacts created.
echo.