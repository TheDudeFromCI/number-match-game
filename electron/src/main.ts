import { app, BrowserWindow } from 'electron'

import { join } from 'path'
import { fileURLToPath, pathToFileURL } from 'url'

interface GameServerOptions {
    frontendDistPath: string
    dataFilePath: string
    host: string
    port: number
}

interface GameServerHandle {
    url: string
    close: () => Promise<void>
}

interface BackendServerModule {
    startGameServer: (options: GameServerOptions) => Promise<GameServerHandle>
}

const __dirname = fileURLToPath(new URL('.', import.meta.url))
const REPO_ROOT = join(__dirname, '..', '..')

let mainWindow: BrowserWindow | null = null
let serverHandle: GameServerHandle | null = null
let isQuitting = false

function getAppRootPath(): string {
    return app.isPackaged ? app.getAppPath() : REPO_ROOT
}

function getFrontendDistPath(): string {
    return join(getAppRootPath(), 'frontend', 'dist')
}

function getBackendServerModulePath(): string {
    return join(getAppRootPath(), 'backend', 'dist', 'src', 'server.js')
}

function getDataFilePath(): string {
    return join(app.getPath('userData'), 'game-instance.json')
}

async function startEmbeddedServer(): Promise<GameServerHandle> {
    const serverModulePath = getBackendServerModulePath()
    const serverModuleUrl = pathToFileURL(serverModulePath).href
    const { startGameServer } = (await import(serverModuleUrl)) as BackendServerModule

    return startGameServer({
        frontendDistPath: getFrontendDistPath(),
        dataFilePath: getDataFilePath(),
        host: '127.0.0.1',
        port: 0,
    })
}

async function closeEmbeddedServer(): Promise<void> {
    if (!serverHandle) {
        return
    }

    const currentHandle = serverHandle
    serverHandle = null
    await currentHandle.close()
}

async function createMainWindow(): Promise<void> {
    if (mainWindow) {
        mainWindow.focus()
        return
    }

    if (!serverHandle) {
        serverHandle = await startEmbeddedServer()
    }

    mainWindow = new BrowserWindow({
        width: 1200,
        height: 900,
        minWidth: 900,
        minHeight: 700,
        autoHideMenuBar: true,
        title: "CI's Number Matcher",
        webPreferences: {
            sandbox: true,
        },
    })

    mainWindow.on('closed', () => {
        mainWindow = null
    })

    await mainWindow.loadURL(serverHandle.url)
}

app.on('before-quit', () => {
    isQuitting = true
})

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        void app.quit()
    }
})

app.on('activate', () => {
    if (!mainWindow) {
        void createMainWindow().catch(async (error: unknown) => {
            console.error('Failed to restore desktop window', error)
            await closeEmbeddedServer()
            app.exit(1)
        })
    }
})

void app
    .whenReady()
    .then(async () => {
        await createMainWindow()
    })
    .catch(async (error: unknown) => {
        console.error('Failed to start desktop app', error)
        await closeEmbeddedServer()
        app.exit(1)
    })

app.on('will-quit', (event) => {
    if (serverHandle && !isQuitting) {
        event.preventDefault()
        isQuitting = true
        void closeEmbeddedServer().finally(() => {
            app.quit()
        })
        return
    }

    if (serverHandle) {
        event.preventDefault()
        void closeEmbeddedServer().finally(() => {
            app.exit(0)
        })
    }
})
