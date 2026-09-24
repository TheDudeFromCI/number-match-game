import './css/global.css'

import type { GameInstance } from 'cis-number-matcher-common'
import { Game, type Pos } from './Game'
import type { GameEvents } from './GameEvents'
import { AppUI } from './ui/AppUI'

const app = new AppUI()

const events: GameEvents = {
    onGameLoaded: async function (game: GameInstance): Promise<void> {
        app.renderGame(game)
    },

    onDeadEnd: async function (_game: GameInstance): Promise<void> {
        await app.gameOver()
    },

    onCellSelected: async function (cell: Pos, selected: boolean): Promise<void> {
        app.setCellSelected(cell, selected)
    },

    onScoreUp: async function (_score: number, _increment: number): Promise<void> {},

    onTopScoreUp: async function (_topScore: number, _isNewTopScore: boolean): Promise<void> {},

    onLineClear: async function (row: number, newRow: number[]): Promise<void> {
        await app.clearRow(row, newRow)
    },

    onDualLineClear: async function (row1: number, row2: number, newRows: number[][]): Promise<void> {
        await app.clearRow(row1, newRows[0])
        await app.clearRow(row2, newRows[1])
    },

    onClearCells: async function (cells: Pos[]): Promise<void> {
        await app.clearCells(cells)
    },
}

Game.loadGame(events)
    .then((game) => {
        console.log('Game loaded:', game)

        app.addListener('cellClick', async (row: number, col: number) => {
            await game.clickCell({ row, col })
        })

        app.addListener('newGame', async () => {
            await game.resetGame()
        })
    })
    .catch((err) => {
        console.error('Error loading game:', err)
    })
