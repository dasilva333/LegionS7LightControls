@echo off
echo.
echo Building DispatcherHost.exe for x64...
echo.
dotnet build "%~dp0DispatcherHost.csproj" -p:Platform=x64
echo.
echo DispatcherHost build complete.
echo.