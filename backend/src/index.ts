import { default as express } from 'express'
import type { Request, Response } from 'express'
import { createServer } from 'http'

import { dirname, join } from 'path'
import { fileURLToPath } from 'url'

import { createRandomGrid, isValidGrid } from 'cis-number-matcher-common'
import type { GameInstance } from 'cis-number-matcher-common'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT_DIR = join(__dirname, '..', '..', '..')
const FRONTEND_DIST = join(ROOT_DIR, 'frontend', 'dist')

const app = express()
const httpServer = createServer(app)

app.use(express.json({ limit: '10mb' }))

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

// The server only ever tracks a single game instance at a time.
let game: GameInstance | null = null

function createGame(): GameInstance {
    const now = Date.now()

    game = {
        grid: createRandomGrid(),
        score: 0,
        createdAt: now,
        updatedAt: now,
    }

    return game
}

app.get('/api/game', (_req: Request, res: Response) => {
    if (!game) {
        res.status(404).json({ error: 'No game instance exists' })
        return
    }

    res.json(game)
})

app.post('/api/game', (_req: Request, res: Response) => {
    res.status(201).json(createGame())
})

app.put('/api/game', (req: Request, res: Response) => {
    if (!game) {
        res.status(404).json({ error: 'No game instance exists' })
        return
    }

    const { grid, score } = req.body ?? {}

    if (grid !== undefined && !isValidGrid(grid)) {
        res.status(400).json({ error: 'Invalid grid' })
        return
    }

    if (score !== undefined && (typeof score !== 'number' || !Number.isInteger(score) || score < game.score)) {
        res.status(400).json({ error: 'Invalid score' })
        return
    }

    if (grid !== undefined) {
        game.grid = grid
    }

    if (score !== undefined) {
        game.score = score
    }

    game.updatedAt = Date.now()

    res.json(game)
})

app.delete('/api/game', (_req: Request, res: Response) => {
    game = null
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
