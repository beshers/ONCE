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
```

Users can download that file from the OCNE Downloads page.
