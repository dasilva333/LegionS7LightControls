@echo off
:: This script builds the EdgeWrapper.csproj for the x64 platform.

echo.
echo Building C# Wrapper for x64...
echo.

:: We use "-p:Platform=x64" which is the correct syntax for the dotnet CLI
:: to pass the "Platform" property to the underlying MSBuild engine.
dotnet build "%~dp0EdgeWrapper.csproj" -p:Platform=x64

echo.
echo C# Wrapper build complete.
echo.