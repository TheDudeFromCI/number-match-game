import popSoundUrl from './sounds/pop.wav'
import clickSoundUrl from './sounds/click.wav'
import scoreUpSoundUrl from './sounds/score-up.wav'
import bigScoreUpSoundUrl from './sounds/big-score-up.wav'
import highScoreSoundUrl from './sounds/high-score.wav'
import gameOverSoundUrl from './sounds/game-over.wav'

import { GRID_SIZE } from 'cis-number-matcher-common'

import type { Cell, Game } from './Game'
import { EventEmitter } from 'events'

export type SoundEffect = 'pop' | 'click' | 'scoreUp' | 'bigScoreUp' | 'highScore' | 'gameOver'
const SOUND_EFFECTS: Record<SoundEffect, HTMLAudioElement> = {
    pop: new Audio(popSoundUrl),
    click: new Audio(clickSoundUrl),
    scoreUp: new Audio(scoreUpSoundUrl),
    bigScoreUp: new Audio(bigScoreUpSoundUrl),
    highScore: new Audio(highScoreSoundUrl),
    gameOver: new Audio(gameOverSoundUrl),
}

export class UI extends EventEmitter {
    private cells: HTMLButtonElement[][]
    private app: HTMLDivElement
    private boardStage: HTMLDivElement
    private grid: HTMLDivElement
    private gameOverOverlay: HTMLDivElement
    private gameOverScore: HTMLParagraphElement
    private scoreCounter: HTMLDivElement
    private topScoreCounter: HTMLDivElement

    constructor() {
        super()

        this.app = document.createElement('div')
        this.app.className = 'app'
        document.body.appendChild(this.app)

        const header = document.createElement('header')
        header.className = 'header'
        this.app.appendChild(header)

        const title = document.createElement('h1')
        title.className = 'title'
        title.textContent = "CI's Number Matcher"
        header.appendChild(title)

        const stats = document.createElement('div')
        stats.className = 'stats'
        header.appendChild(stats)

        this.scoreCounter = document.createElement('div')
        this.scoreCounter.className = 'score'
        stats.appendChild(this.scoreCounter)

        this.topScoreCounter = document.createElement('div')
        this.topScoreCounter.className = 'top-score'
        stats.appendChild(this.topScoreCounter)

        const actions = document.createElement('div')
        actions.className = 'actions'
        header.appendChild(actions)

        const newGameButton = document.createElement('button')
        newGameButton.className = 'new-game'
        newGameButton.textContent = 'New Game'
        newGameButton.addEventListener('click', () => this.emit('newGame'))
        actions.appendChild(newGameButton)

        this.boardStage = document.createElement('div')
        this.boardStage.className = 'board-stage'
        this.app.appendChild(this.boardStage)

        this.grid = document.createElement('div')
        this.grid.className = 'grid'
        this.boardStage.appendChild(this.grid)

        this.gameOverOverlay = document.createElement('div')
        this.gameOverOverlay.className = 'game-over-overlay'

        const gameOverTitle = document.createElement('h2')
        gameOverTitle.className = 'game-over-title'
        gameOverTitle.textContent = 'Game Over'
        this.gameOverOverlay.appendChild(gameOverTitle)

        this.gameOverScore = document.createElement('p')
        this.gameOverScore.className = 'game-over-score'
        this.gameOverOverlay.appendChild(this.gameOverScore)

        this.grid.appendChild(this.gameOverOverlay)

        this.cells = []
        for (let row = 0; row < GRID_SIZE; row++) {
            const rowCells: HTMLButtonElement[] = []

            for (let col = 0; col < GRID_SIZE; col++) {
                const cell = document.createElement('button')
                cell.className = 'cell'
                cell.addEventListener('click', () => this.emit('cellClick', row, col))
                this.grid.appendChild(cell)
                rowCells.push(cell)
            }

            this.cells.push(rowCells)
        }

        window.addEventListener('resize', () => this.updateLayout())
        requestAnimationFrame(() => this.updateLayout())
    }

    private updateLayout(): void {
        const isLandscape = window.innerWidth > window.innerHeight
        this.app.dataset['layout'] = isLandscape ? 'landscape' : 'portrait'

        const boardSize = Math.floor(Math.min(this.boardStage.clientWidth, this.boardStage.clientHeight))
        this.app.style.setProperty('--board-size', `${Math.max(boardSize, 0)}px`)
    }

    render(game: Game): void {
        const isGameOver = game.checkIfDeadEnd()

        this.scoreCounter.textContent = `Score: ${game.data.score}`
        this.topScoreCounter.textContent = `🏆 Top: ${game.data.topScore}`
        this.gameOverScore.textContent = `Final Score: ${game.data.score}`
        this.grid.classList.toggle('grid--game-over', isGameOver)

        for (let row = 0; row < GRID_SIZE; row++) {
            for (let col = 0; col < GRID_SIZE; col++) {
                const value = game.getCellValue({ row, col })
                const cell = this.cells[row]?.[col]
                if (!cell) continue

                cell.textContent = value === 0 ? '' : String(value)
                cell.disabled = value === 0 || isGameOver
                cell.classList.toggle('empty', value === 0)
                cell.classList.toggle('selected', game.selectedCell?.row === row && game.selectedCell?.col === col)
            }
        }
    }

    animateScoreUpdated(): void {
        this.scoreCounter.classList.remove('score--updated')
        void this.scoreCounter.offsetWidth
        this.scoreCounter.classList.add('score--updated')
    }

    animateTopScoreUpdated(): void {
        this.topScoreCounter.classList.remove('top-score--updated')
        void this.topScoreCounter.offsetWidth
        this.topScoreCounter.classList.add('top-score--updated')
    }

    animateLineClear(movedCells: Array<{ from: Cell; to: Cell }>): void {
        for (const [index, { to }] of movedCells.entries()) {
            const cell = this.cells[to.row]?.[to.col]
            if (!cell) continue

            cell.classList.remove('cell--falling')
            void cell.offsetWidth
            cell.style.setProperty('--fall-delay', `${index * 22}ms`)
            cell.classList.add('cell--falling')

            cell.addEventListener(
                'animationend',
                () => {
                    cell.classList.remove('cell--falling')
                    cell.style.removeProperty('--fall-delay')
                },
                { once: true },
            )
        }
    }

    scoreUpEffect(cell: Cell, score: number): void {
        const cellElement = this.cells[cell.row]?.[cell.col]
        if (!cellElement) return

        const gridRect = this.grid.getBoundingClientRect()
        const cellRect = cellElement.getBoundingClientRect()

        const effect = document.createElement('span')
        effect.className = 'score-effect'
        effect.textContent = `+${score}`
        effect.style.left = `${cellRect.left - gridRect.left + cellRect.width / 2}px`
        effect.style.top = `${cellRect.top - gridRect.top + cellRect.height / 2}px`
        effect.style.width = `${cellRect.width}px`
        effect.style.height = `${cellRect.height}px`
        this.grid.appendChild(effect)

        requestAnimationFrame(() => {
            effect.classList.add('score-effect--visible')
        })

        effect.addEventListener(
            'animationend',
            () => {
                effect.remove()
            },
            { once: true },
        )
    }

    playSound(effect: SoundEffect): void {
        for (const audio of Object.values(SOUND_EFFECTS)) {
            audio.pause()
            audio.currentTime = 0
        }

        const audio = SOUND_EFFECTS[effect]
        audio.currentTime = 0
        audio.play().catch((error) => {
            console.error(`Failed to play sound effect "${effect}":`, error)
        })
    }
}
