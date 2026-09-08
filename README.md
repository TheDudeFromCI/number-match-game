# CI's Number Matcher

This project now has a desktop Electron wrapper around the existing Vite frontend and Express backend.

## Desktop app

Install the root dependencies first:

```bash
npm install
```

Run the desktop app locally:

```bash
npm start
```

Build a distributable Linux AppImage:

```bash
npm run package
```

Or use the root shell wrapper to clean and rebuild the `release/` directory:

```bash
./build-release.sh
```

Build Windows artifacts from Linux:

```bash
./build-release.sh --win
```

Build both Linux and Windows artifacts:

```bash
./build-release.sh --all
```

The packaged app starts the backend internally and stores save data in the Electron user data directory instead of the repository root.

## Project layout

- `frontend/` contains the Vite web UI.
- `backend/` contains the Express API server.
- `electron/` contains the Electron main process that starts the backend and opens the desktop window.

## Notes

- The desktop build uses the existing `install.sh --dev` flow to build `common`, `frontend`, and `backend` before compiling Electron.
- If your package manager blocks install scripts, Electron may not download its runtime binary automatically. In that case, allow Electron's postinstall step and rerun `npm install` before trying `npm start` or `npm run package`.
- Windows builds produced on Linux are unsigned by default, so Windows may show a SmartScreen warning until you add code signing.
