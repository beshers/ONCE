# OCNE Desktop

OCNE Desktop is an Avalonia/C# desktop wrapper for the OCNE website.

It opens `https://ocne.onrender.com/` inside a native desktop window so users can use the online editor like an installed program.

## Build

```powershell
dotnet restore .\ocne-desktop\OCNE.Desktop.csproj
dotnet build .\ocne-desktop\OCNE.Desktop.csproj -c Release
```

## Publish Windows Zip

```powershell
.\ocne-desktop\publish-windows.ps1
```

The script creates:

```text
public/downloads/OCNE-Desktop-App-Windows.zip
public/downloads/OCNE-Desktop-App-Windows-Lite.zip
```

The standalone Windows build is self-contained. Users can extract the ZIP and run `OCNE.Desktop.exe` without installing the .NET runtime separately.

The Lite Windows build is framework-dependent. It is smaller and is the better choice when antivirus software blocks the unsigned standalone app, but users need the Microsoft .NET 10 Desktop Runtime installed.

## Publish macOS Zips

```powershell
.\ocne-desktop\publish-macos.ps1
```

The script creates:

```text
public/downloads/OCNE-Desktop-App-macOS-Apple-Silicon.zip
public/downloads/OCNE-Desktop-App-macOS-Intel.zip
```

These builds are framework-dependent. macOS users need the .NET 10 runtime installed before running `OCNE.Desktop`.

Users can download that file from the OCNE Downloads page.
