import { default as express } from 'express'
import type { Request, Response } from 'express'
import { createServer } from 'http'

import { dirname, join } from 'path'
import { fileURLToPath } from 'url'

import { isValidGrid } from 'cis-number-matcher-common'
import type { GameInstance } from 'cis-number-matcher-common'
import { Storage } from './Storage.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT_DIR = join(__dirname, '..', '..', '..')
const FRONTEND_DIST = join(ROOT_DIR, 'frontend', 'dist')

const app = express()
const httpServer = createServer(app)
const storage = new Storage(join(ROOT_DIR, 'game-instance.json'))

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

app.use(express.static(FRONTEND_DIST))

app.all('*', (_req: Request, res: Response) => {
    console.warn('Received request for unknown route:', _req.originalUrl)
    res.status(404).sendFile(join(FRONTEND_DIST, '404.html'))
})

const PORT = parseInt(process.env['PORT'] || '8000', 10)
const HOST = process.env['HOST'] || '127.0.0.1'

httpServer.listen(PORT, HOST, () => {
    console.log(`Server running at http://${HOST}:${PORT}`)
})
