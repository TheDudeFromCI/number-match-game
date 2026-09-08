import { createServer, type Server as HttpServer } from 'http'
import { mkdir } from 'fs/promises'
import { dirname, join } from 'path'
import { fileURLToPath, pathToFileURL } from 'url'

import express, { type Express, type Request, type Response } from 'express'

import type { GameInstance } from 'cis-number-matcher-common'
import { Storage } from './Storage.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const DEFAULT_ROOT_DIR = join(__dirname, '..', '..', '..')
const DEFAULT_FRONTEND_DIST = join(DEFAULT_ROOT_DIR, 'frontend', 'dist')
const DEFAULT_DATA_FILE = join(DEFAULT_ROOT_DIR, 'game-instance.json')
const COMMON_DIST_MODULE_URL = pathToFileURL(join(DEFAULT_ROOT_DIR, 'common', 'dist', 'index.js')).href

interface CommonModule {
    isValidGrid: (grid: GameInstance['grid']) => boolean
}

export interface GameServerOptions {
    frontendDistPath?: string
    dataFilePath?: string
    host?: string
    port?: number
}

export interface GameServerHandle {
    app: Express
    httpServer: HttpServer
    host: string
    port: number
    url: string
    close: () => Promise<void>
}

export async function startGameServer(options: GameServerOptions = {}): Promise<GameServerHandle> {
    const { isValidGrid } = (await import(COMMON_DIST_MODULE_URL)) as CommonModule
    const frontendDistPath = options.frontendDistPath ?? DEFAULT_FRONTEND_DIST
    const dataFilePath = options.dataFilePath ?? DEFAULT_DATA_FILE
    const host = options.host ?? process.env['HOST'] ?? '127.0.0.1'
    const port = options.port ?? parseInt(process.env['PORT'] || '8000', 10)

    await mkdir(dirname(dataFilePath), { recursive: true })

    const app = express()
    const httpServer = createServer(app)
    const storage = new Storage(dataFilePath)

    app.use(express.json({ limit: '512kb' }))

    app.use((req: Request, res: Response, next: () => void) => {
        res.header('Access-Control-Allow-Origin', '*')
        res.header('Access-Control-Allow-Credentials', 'true')
        res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
        res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization')

        if (req.method === 'OPTIONS') {
            res.sendStatus(200)
            return
        }

        next()
    })

    app.get('/api/health', async (_req: Request, res: Response) => {
        res.json({ status: 'ok' })
    })

    app.get('/api/game', async (_req: Request, res: Response) => {
        const game = await storage.readGameInstance()

        if (!game) {
            res.status(404).json({ error: 'No game instance exists' })
            return
        }

        res.json(game)
    })

    app.post('/api/game', async (req: Request, res: Response) => {
        const game = req.body as GameInstance

        if (!game.grid || !isValidGrid(game.grid)) {
            res.status(400).json({ error: 'Invalid grid' })
            return
        }

        if (typeof game.score !== 'number' || game.score < 0) {
            res.status(400).json({ error: 'Invalid score' })
            return
        }

        if (typeof game.createdAt !== 'number' || typeof game.updatedAt !== 'number') {
            res.status(400).json({ error: 'Invalid timestamps' })
            return
        }

        await storage.writeGameInstance(game)
        res.status(201).json({ message: 'Game instance saved successfully' })
    })

    app.delete('/api/game', async (_req: Request, res: Response) => {
        await storage.deleteGameInstance()
        res.status(204).end()
    })

    app.all('/api/*', (_req: Request, res: Response) => {
        console.warn('Received request for unknown API endpoint:', _req.originalUrl)
        res.status(404).json({ error: 'Not found' })
    })

    app.use(express.static(frontendDistPath))

    app.all('*', (_req: Request, res: Response) => {
        console.warn('Received request for unknown route:', _req.originalUrl)
        res.status(404).sendFile(join(frontendDistPath, '404.html'))
    })

    await new Promise<void>((resolve, reject) => {
        const onError = (error: Error) => {
            httpServer.off('listening', onListening)
            reject(error)
        }

        const onListening = () => {
            httpServer.off('error', onError)
            resolve()
        }

        httpServer.once('error', onError)
        httpServer.once('listening', onListening)
        httpServer.listen(port, host)
    })

    const address = httpServer.address()
    const resolvedPort = typeof address === 'object' && address ? address.port : port
    const url = `http://${host}:${resolvedPort}`

    return {
        app,
        httpServer,
        host,
        port: resolvedPort,
        url,
        close: async () => {
            await new Promise<void>((resolveClose, rejectClose) => {
                httpServer.close((error) => {
                    if (error) {
                        rejectClose(error)
                        return
                    }

                    resolveClose()
                })
            })
        },
    }
}
