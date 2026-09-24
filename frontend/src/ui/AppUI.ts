import '../css/app.css'

import type { GameInstance } from 'cis-number-matcher-common'
import { Grid } from './Grid'
import type { Pos } from '../Game'
import { EventEmitter } from 'events'
import { Enemy, EnemyType } from './Enemy'

export class AppUI extends EventEmitter {
    private readonly grid: Grid
    private readonly enemy: Enemy
    private readonly gameOverOverlay: HTMLDivElement

    public constructor() {
        super()

        const root = document.createElement('div')
        root.classList.add('app')
        document.body.appendChild(root)

        const gridContainer = document.createElement('div')
        gridContainer.classList.add('grid-container')
        root.appendChild(gridContainer)

        this.grid = new Grid()
        gridContainer.appendChild(this.grid.rootElement)
        this.grid.addListener('cellClick', (row: number, col: number) => {
            this.emit('cellClick', row, col)
        })

        this.gameOverOverlay = document.createElement('div')
        this.gameOverOverlay.classList.add('game-over-overlay')

        const gameOverTitle = document.createElement('h2')
        gameOverTitle.classList.add('game-over-title')
        gameOverTitle.textContent = 'Game Over'

        const newGameButton = document.createElement('button')
        newGameButton.classList.add('new-game-button')
        newGameButton.type = 'button'
        newGameButton.textContent = 'New Game'
        newGameButton.addEventListener('click', () => this.emit('newGame'))

        this.gameOverOverlay.appendChild(gameOverTitle)
        this.gameOverOverlay.appendChild(newGameButton)
        gridContainer.appendChild(this.gameOverOverlay)

        const sidePanel = document.createElement('div')
        sidePanel.classList.add('side-panel')
        root.appendChild(sidePanel)

        this.enemy = new Enemy(EnemyType.BananaVirus)
        sidePanel.appendChild(this.enemy.rootElement)
    }

    public renderGame(game: GameInstance): void {
        this.grid.updateCells(game.grid)
        this.gameOverOverlay.classList.remove('is-visible')
    }

    public setCellSelected(cell: Pos, selected: boolean): void {
        this.grid.getCell(cell).selected = selected
    }

    public async clearRow(row: number, newRow: number[]): Promise<void> {
        await this.grid.clearRow(row, newRow)
    }

    public async clearCells(cells: Pos[]): Promise<void> {
        for (const cell of cells) {
            this.grid.getCell(cell).value = 0
        }
    }

    public async gameOver(): Promise<void> {
        await this.grid.gameOver()
        this.gameOverOverlay.classList.add('is-visible')
    }
}
