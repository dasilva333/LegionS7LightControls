@echo off
echo.
echo Building C# Wrapper for x64...
echo.
dotnet build "%~dp0SetProfileDetailsWrapper.csproj" -p:Platform=x64
echo.
echo C# Wrapper build complete.
echo.