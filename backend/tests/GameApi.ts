import test from 'node:test'
import assert from 'node:assert/strict'
import { spawn, type ChildProcessWithoutNullStreams } from 'node:child_process'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { GRID_SIZE } from 'cis-number-matcher-common'

const __dirname = dirname(fileURLToPath(import.meta.url))
const BACKEND_DIR = join(__dirname, '..')
const HOST = '127.0.0.1'
const PORT = 8123
const BASE_URL = `http://${HOST}:${PORT}`

let server: ChildProcessWithoutNullStreams

async function waitForServer(): Promise<void> {
    for (let attempt = 0; attempt < 50; attempt++) {
        try {
            const response = await fetch(`${BASE_URL}/api/health`)

            if (response.ok) {
                return
            }
        } catch {
            // Server is not ready yet, retry shortly.
        }

        await new Promise((resolve) => setTimeout(resolve, 100))
    }

    throw new Error('Server did not start in time')
}

test.before(async () => {
    server = spawn(join(BACKEND_DIR, 'node_modules', '.bin', 'tsx'), [join(BACKEND_DIR, 'src', 'index.ts')], {
        cwd: BACKEND_DIR,
        env: { ...process.env, PORT: String(PORT), HOST },
    })

    await waitForServer()
})

test.after(() => {
    server.kill()
})

test('GET /api/game returns 404 when no game instance exists', async () => {
    const response = await fetch(`${BASE_URL}/api/game`)
    assert.strictEqual(response.status, 404)
})

test('POST /api/game creates a new nxn game instance', async () => {
    const response = await fetch(`${BASE_URL}/api/game`, { method: 'POST' })
    assert.strictEqual(response.status, 201)

    const body = await response.json()
    assert.strictEqual(body.grid.length, GRID_SIZE)
    assert.strictEqual(body.grid[0].length, GRID_SIZE)
    assert.strictEqual(body.score, 0)

    for (const row of body.grid) {
        for (const value of row) {
            assert.ok(value >= 1 && value <= 9, `expected digit between 1 and 9, got ${value}`)
        }
    }
})

test('GET /api/game retrieves the previously created game instance', async () => {
    const response = await fetch(`${BASE_URL}/api/game`)
    assert.strictEqual(response.status, 200)

    const body = await response.json()
    assert.strictEqual(body.score, 0)
})

test('PUT /api/game updates the score and grid of the existing game instance', async () => {
    const response = await fetch(`${BASE_URL}/api/game`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ score: 42 }),
    })
    assert.strictEqual(response.status, 200)

    const body = await response.json()
    assert.strictEqual(body.score, 42)
})

test('PUT /api/game rejects an invalid score', async () => {
    const response = await fetch(`${BASE_URL}/api/game`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ score: 'not-a-number' }),
    })
    assert.strictEqual(response.status, 400)
})

test('PUT /api/game rejects a decreasing score', async () => {
    const response = await fetch(`${BASE_URL}/api/game`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ score: 1 }),
    })
    assert.strictEqual(response.status, 400)
})

test('DELETE /api/game removes the single game instance', async () => {
    const deleteResponse = await fetch(`${BASE_URL}/api/game`, { method: 'DELETE' })
    assert.strictEqual(deleteResponse.status, 204)

    const getResponse = await fetch(`${BASE_URL}/api/game`)
    assert.strictEqual(getResponse.status, 404)
})

test('PUT /api/game returns 404 when no game instance exists', async () => {
    const response = await fetch(`${BASE_URL}/api/game`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ score: 1 }),
    })
    assert.strictEqual(response.status, 404)
})
