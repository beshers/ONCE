# OCNE Desktop Agent

OCNE Desktop Agent is the planned Windows/macOS app that connects the OCNE website to a user's computer.

This is the first desktop scaffold. It is separate from the web app so the website deployment stays stable.

## What It Does

- Opens a desktop window.
- Starts a local server on `http://127.0.0.1:48731`.
- Accepts requests only from OCNE origins.
- Uses a pairing token.
- Runs terminal commands directly after pairing.
- Can allow either a selected workspace folder or all files/drives the computer user can access.

## Run In Development

From this folder:

```powershell
cd D:\xampp\php-backend\desktop-agent
npm install
npm run dev
```

The app will show:

- Agent URL
- pairing token
- access mode
- workspace

## Build Installers

Generate icons first:

```powershell
npm run icons
```

Windows:

```powershell
npm run package:win
```

macOS:

```bash
npm run package:mac
```

## Security Model

The desktop agent only listens on `127.0.0.1`, so it is not exposed directly to the internet.

It accepts browser requests only from:

- `https://ocne.onrender.com`
- `http://localhost:5173`
- `http://127.0.0.1:5173`

Every command requires the pairing token. Commands run with the permissions of the local Windows/macOS user.

For a production release, add code signing, auto-update, and a first-run pairing screen before publishing installers.

## Production Release Notes

The scaffold includes:

- app icons generated into `build/`
- branded Windows installer header/sidebar artwork
- guided Windows installer flow with license text and install folder selection
- desktop and Start Menu shortcuts
- Windows/macOS start-at-login setting
- `electron-updater` wiring
- GitHub Releases publish configuration
- Windows/macOS signing configuration placeholders

For a public build:

- Windows: add a real code-signing certificate and remove `"signAndEditExecutable": false`.
- To make the app itself ask for administrator permission on every launch, set `"requestedExecutionLevel": "requireAdministrator"` in `build.win`, remove `"signAndEditExecutable": false`, and run the package command from an elevated Windows session or with Windows Developer Mode enabled. This build step edits the Windows executable manifest.
- macOS: build on macOS with an Apple Developer ID certificate and notarization credentials.
- Auto-update: publish installer releases to GitHub Releases for `beshers/ONCE`.
