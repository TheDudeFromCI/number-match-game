import './css/global.css'

import { GRID_SIZE } from 'cis-number-matcher-common'
import type { GameInstance } from 'cis-number-matcher-common'

const API_BASE = '/api/game'

let game: GameInstance | null = null
let selected: { row: number; col: number } | null = null

const app = document.createElement('div')
app.className = 'app'
document.body.appendChild(app)

const header = document.createElement('header')
header.className = 'header'
app.appendChild(header)

const title = document.createElement('h1')
title.className = 'title'
title.textContent = "CI's Number Matcher"
header.appendChild(title)

const scoreCounter = document.createElement('div')
scoreCounter.className = 'score'
header.appendChild(scoreCounter)

const newGameButton = document.createElement('button')
newGameButton.className = 'new-game'
newGameButton.textContent = 'New Game'
header.appendChild(newGameButton)

const grid = document.createElement('div')
grid.className = 'grid'
app.appendChild(grid)

const cells: HTMLButtonElement[][] = []

for (let row = 0; row < GRID_SIZE; row++) {
    const rowCells: HTMLButtonElement[] = []

    for (let col = 0; col < GRID_SIZE; col++) {
        const cell = document.createElement('button')
        cell.className = 'cell'
        cell.addEventListener('click', () => onCellClick(row, col).catch((error) => console.error(error)))
        grid.appendChild(cell)
        rowCells.push(cell)
    }

    cells.push(rowCells)
}

function renderScore(): void {
    scoreCounter.textContent = `Score: ${game?.score ?? 0}`
}

function renderGrid(): void {
    if (!game) {
        return
    }

    for (let row = 0; row < GRID_SIZE; row++) {
        for (let col = 0; col < GRID_SIZE; col++) {
            const value = game.grid[row]?.[col] ?? 0
            const cell = cells[row]?.[col]

            if (!cell) {
                continue
            }

            cell.textContent = value === 0 ? '' : String(value)
            cell.disabled = value === 0
            cell.classList.toggle('selected', selected?.row === row && selected?.col === col)
        }
    }
}

function render(): void {
    renderScore()
    renderGrid()
}

async function fetchGame(): Promise<GameInstance | null> {
    const response = await fetch(API_BASE)

    if (response.status === 404) {
        return null
    }

    if (!response.ok) {
        throw new Error(`Failed to load game: ${response.status}`)
    }

    return (await response.json()) as GameInstance
}

async function createGame(): Promise<GameInstance> {
    const response = await fetch(API_BASE, { method: 'POST' })

    if (!response.ok) {
        throw new Error(`Failed to create game: ${response.status}`)
    }

    return (await response.json()) as GameInstance
}

async function deleteGame(): Promise<void> {
    const response = await fetch(API_BASE, { method: 'DELETE' })

    if (!response.ok && response.status !== 404) {
        throw new Error(`Failed to delete game: ${response.status}`)
    }
}

async function updateGame(update: { grid?: number[][]; score?: number }): Promise<GameInstance> {
    const response = await fetch(API_BASE, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(update),
    })

    if (!response.ok) {
        throw new Error(`Failed to update game: ${response.status}`)
    }

    return (await response.json()) as GameInstance
}

async function onCellClick(row: number, col: number): Promise<void> {
    if (!game) {
        return
    }

    const value = game.grid[row]?.[col]

    if (!value) {
        return
    }

    if (!selected) {
        selected = { row, col }
        render()
        return
    }

    if (selected.row === row && selected.col === col) {
        selected = null
        render()
        return
    }

    const selectedValue = game.grid[selected.row]?.[selected.col]

    if (selectedValue === value) {
        const nextGrid = game.grid.map((r) => [...r])

        const selectedRow = nextGrid[selected.row]
        const currentRow = nextGrid[row]

        if (selectedRow) {
            selectedRow[selected.col] = 0
        }

        if (currentRow) {
            currentRow[col] = 0
        }

        const nextScore = game.score + value

        selected = null
        game = await updateGame({ grid: nextGrid, score: nextScore })
        render()
        return
    }

    selected = { row, col }
    render()
}

async function startNewGame(): Promise<void> {
    await deleteGame()
    game = await createGame()
    selected = null
    render()
}

newGameButton.addEventListener('click', () => {
    newGameButton.disabled = true

    startNewGame()
        .catch((error) => console.error(error))
        .finally(() => {
            newGameButton.disabled = false
        })
})

async function init(): Promise<void> {
    game = (await fetchGame()) ?? (await createGame())
    render()
}

init().catch((error) => {
    console.error(error)

    // The backend is unreachable; disable interaction rather than presenting an unsynced, broken game.
    scoreCounter.textContent = 'Unable to reach the server. Please refresh the page to try again.'
    newGameButton.disabled = true

    for (const row of cells) {
        for (const cell of row) {
            cell.textContent = ''
            cell.disabled = true
        }
    }
})
