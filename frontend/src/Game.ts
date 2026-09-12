import { createRandomGrid, GRID_SIZE, type GameInstance } from 'cis-number-matcher-common'
import { fetchGameInstance, saveGameInstance } from './API'
import type { GameEvents } from './GameEvents'

const LINE_CLEAR_SCORE = 50
const DUAL_LINE_CLEAR_SCORE = 150

export interface Pos {
    row: number
    col: number
}

export class Game {
    private readonly events: GameEvents
    private _data: GameInstance
    private selected: Pos | null = null

    static async loadGame(events: GameEvents): Promise<Game> {
        const gameInstance = await fetchGameInstance()

        let game
        if (!gameInstance) game = new Game(createNewGameInstance(0), events)
        else game = new Game(gameInstance, events)

        await game.events.onGameLoaded(game.data)

        if (game.checkIfDeadEnd()) {
            await game.events.onDeadEnd(game.data)
        }

        return game
    }

    private constructor(data: GameInstance, events: GameEvents) {
        this.events = events
        this._data = data
    }

    private async selectCell(cell: Pos): Promise<void> {
        if (this.selected && matches(this.selected, cell)) return
        await this.deselectCell()
        this.selected = cell
        await this.events.onCellSelected(cell, true)
    }

    async deselectCell(): Promise<void> {
        if (this.selected === null) return
        await this.events.onCellSelected(this.selected, false)
        this.selected = null
    }

    get data(): Readonly<GameInstance> {
        return this._data
    }

    get selectedCell(): Pos | null {
        return this.selected
    }

    getCellValue(cell: Pos): number {
        return this._data.grid[cell.row][cell.col]
    }

    private setCellValue(cell: Pos, value: number): void {
        if (!this._data.grid[cell.row]) {
            this._data.grid[cell.row] = []
        }
        this._data.grid[cell.row][cell.col] = value
        this._data.updatedAt = Date.now()
    }

    private async incrementScore(amount: number): Promise<void> {
        const isNewTopScore =
            this._data.topScore > 0 &&
            this._data.score < this._data.topScore &&
            this._data.score + amount >= this._data.topScore

        this._data.score += amount
        this._data.updatedAt = Date.now()
        await this.events.onScoreUp(this._data.score, amount)

        if (this._data.score > this._data.topScore || this._data.topScore == null) {
            this._data.topScore = this._data.score
            await this.events.onTopScoreUp(this._data.topScore, isNewTopScore)
        }
    }

    public async clickCell(target: Pos): Promise<void> {
        const value = this.getCellValue(target)
        if (value <= 0) return

        if (!this.selected) {
            await this.selectCell(target)
            return
        }

        if (matches(this.selected, target)) {
            await this.deselectCell()
            return
        }

        if (await this.attemptClear(this.selected, target)) {
            const minRow = Math.min(this.selected.row, target.row)
            const maxRow = Math.max(this.selected.row, target.row)

            if (minRow === maxRow) {
                if (this.checkLineClear(minRow)) {
                    await this.incrementScore(LINE_CLEAR_SCORE)
                    await this.events.onLineClear(minRow, this._data.grid[0])
                }
            } else {
                const aCleared = this.checkLineClear(minRow)
                const bCleared = this.checkLineClear(maxRow)

                if (aCleared && bCleared) {
                    await this.incrementScore(DUAL_LINE_CLEAR_SCORE)
                    await this.events.onDualLineClear(minRow, maxRow, [this._data.grid[1], this._data.grid[0]])
                } else if (aCleared) {
                    await this.incrementScore(LINE_CLEAR_SCORE)
                    await this.events.onLineClear(minRow, this._data.grid[0])
                } else if (bCleared) {
                    await this.incrementScore(LINE_CLEAR_SCORE)
                    await this.events.onLineClear(maxRow, this._data.grid[0])
                }
            }

            await this.deselectCell()
            await saveGameInstance(this._data)

            if (this.checkIfDeadEnd()) {
                await this.events.onDeadEnd(this._data)
            }
        } else {
            await this.selectCell(target)
        }
    }

    private async attemptClear(a: Pos, b: Pos): Promise<boolean> {
        if (!this.confirmPair(a, b)) return false
        if (await this.checkRow(a, b)) return true
        if (await this.checkRowWrap(a, b)) return true
        if (await this.checkColumn(a, b)) return true
        if (await this.checkColumnWrap(a, b)) return true
        if (await this.checkLeftDiagonal(a, b)) return true
        if (await this.checkRightDiagonal(a, b)) return true
        return false
    }

    private confirmPair(a: Pos, b: Pos): boolean {
        if (matches(a, b)) return false

        const aValue = this.getCellValue(a)
        const bValue = this.getCellValue(b)

        if (aValue <= 0 || bValue <= 0) return false
        if (aValue === bValue) return true
        return aValue + bValue === 10
    }

    private async checkRow(a: Pos, b: Pos): Promise<boolean> {
        if (a.row !== b.row) return false

        const min = Math.min(a.col, b.col)
        const max = Math.max(a.col, b.col)

        for (let col = min + 1; col < max; col++) {
            if (this.getCellValue({ row: a.row, col }) > 0) {
                return false
            }
        }

        const score = 2 ** (max - min)
        this.setCellValue(a, 0)
        this.setCellValue(b, 0)
        await this.incrementScore(score)
        await this.events.onClearCells([a, b])
        return true
    }

    private async checkRowWrap(a: Pos, b: Pos): Promise<boolean> {
        if (a.row !== b.row) return false

        const rowLength = this._data.grid[a.row].length
        const min = Math.min(a.col, b.col)
        const max = Math.max(a.col, b.col)

        for (let col = max + 1; col < rowLength; col++) {
            if (this.getCellValue({ row: a.row, col }) > 0) {
                return false
            }
        }

        for (let col = 0; col < min; col++) {
            if (this.getCellValue({ row: a.row, col }) > 0) {
                return false
            }
        }

        const score = 2 ** (rowLength - (max - min))
        this.setCellValue(a, 0)
        this.setCellValue(b, 0)
        await this.incrementScore(score)
        await this.events.onClearCells([a, b])

        return true
    }

    private async checkColumn(a: Pos, b: Pos): Promise<boolean> {
        if (a.col !== b.col) return false

        const min = Math.min(a.row, b.row)
        const max = Math.max(a.row, b.row)

        for (let row = min + 1; row < max; row++) {
            if (this.getCellValue({ row, col: a.col }) > 0) {
                return false
            }
        }

        const score = 2 ** (max - min)
        this.setCellValue(a, 0)
        this.setCellValue(b, 0)
        await this.incrementScore(score)
        await this.events.onClearCells([a, b])
        return true
    }

    private async checkColumnWrap(a: Pos, b: Pos): Promise<boolean> {
        if (a.col !== b.col) return false

        const colLength = this._data.grid.length
        const min = Math.min(a.row, b.row)
        const max = Math.max(a.row, b.row)

        for (let row = max + 1; row < colLength; row++) {
            if (this.getCellValue({ row, col: a.col }) > 0) {
                return false
            }
        }

        for (let row = 0; row < min; row++) {
            if (this.getCellValue({ row, col: a.col }) > 0) {
                return false
            }
        }

        const score = 2 ** (colLength - (max - min))
        this.setCellValue(a, 0)
        this.setCellValue(b, 0)
        await this.incrementScore(score)
        await this.events.onClearCells([a, b])
        return true
    }

    private async checkLeftDiagonal(a: Pos, b: Pos): Promise<boolean> {
        const rowDiff = b.row - a.row
        const colDiff = b.col - a.col

        if (Math.abs(rowDiff) !== Math.abs(colDiff)) return false

        const rowStep = rowDiff > 0 ? 1 : -1
        const colStep = colDiff > 0 ? 1 : -1

        let row = a.row + rowStep
        let col = a.col + colStep

        while (row !== b.row && col !== b.col) {
            if (this.getCellValue({ row, col }) > 0) {
                return false
            }
            row += rowStep
            col += colStep
        }

        const score = 2 ** Math.abs(rowDiff)
        this.setCellValue(a, 0)
        this.setCellValue(b, 0)
        await this.incrementScore(score)
        await this.events.onClearCells([a, b])
        return true
    }

    private async checkRightDiagonal(a: Pos, b: Pos): Promise<boolean> {
        const rowDiff = b.row - a.row
        const colDiff = b.col - a.col

        if (Math.abs(rowDiff) !== Math.abs(colDiff)) return false

        const rowStep = rowDiff > 0 ? 1 : -1
        const colStep = colDiff > 0 ? -1 : 1

        let row = a.row + rowStep
        let col = a.col + colStep

        while (row !== b.row && col !== b.col) {
            if (this.getCellValue({ row, col }) > 0) {
                return false
            }
            row += rowStep
            col += colStep
        }

        const score = 2 ** Math.abs(rowDiff)
        this.setCellValue(a, 0)
        this.setCellValue(b, 0)
        await this.incrementScore(score)
        await this.events.onClearCells([a, b])
        return true
    }

    private checkLineClear(row: number): boolean {
        for (let col = 0; col < GRID_SIZE; col++) {
            if (this.getCellValue({ row, col }) > 0) {
                return false
            }
        }

        // shift all rows above down by one
        for (let r = row; r > 0; r--) {
            for (let col = 0; col < GRID_SIZE; col++) {
                const fromCell = { row: r - 1, col }
                const toCell = { row: r, col }
                const valueAbove = this.getCellValue(fromCell)
                this.setCellValue(toCell, valueAbove)
            }
        }

        // randomly fill the top row with new values
        for (let col = 0; col < GRID_SIZE; col++) {
            const newValue = Math.floor(Math.random() * 9) + 1
            this.setCellValue({ row: 0, col }, newValue)
        }

        return true
    }

    async resetGame(): Promise<void> {
        await this.deselectCell()
        this._data = createNewGameInstance(this._data.topScore)
        await this.events.onGameLoaded(this._data)
        await saveGameInstance(this._data)
    }

    checkIfDeadEnd(): boolean {
        return isDeadEnd(this._data.grid)
    }
}

function createNewGameInstance(topScore: number): GameInstance {
    return {
        grid: createRandomGrid(),
        score: 0,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        topScore,
    } as GameInstance
}

function matches(a: Pos, b: Pos): boolean {
    return a.row === b.row && a.col === b.col
}

function isDeadEnd(grid: number[][]): boolean {
    for (let row = 0; row < GRID_SIZE; row++) {
        for (let col = 0; col < GRID_SIZE; col++) {
            if (!isCellDeadEnd({ row, col }, grid)) return false
        }
    }

    return true
}

function isCellDeadEnd(cell: Pos, grid: number[][]): boolean {
    const value = grid[cell.row][cell.col]
    if (value === 0) return true

    // Check left
    for (let col = cell.col - 1; col > cell.col - GRID_SIZE; col--) {
        const check = grid[cell.row][(col + GRID_SIZE) % GRID_SIZE]
        if (check === 0) continue
        if (check === value || check + value === 10) return false
        else break
    }

    // Check right
    for (let col = cell.col + 1; col < cell.col + GRID_SIZE; col++) {
        const check = grid[cell.row][col % GRID_SIZE]
        if (check === 0) continue
        if (check === value || check + value === 10) return false
        else break
    }

    // Check up
    for (let row = cell.row - 1; row > cell.row - GRID_SIZE; row--) {
        const check = grid[(row + GRID_SIZE) % GRID_SIZE][cell.col]
        if (check === 0) continue
        if (check === value || check + value === 10) return false
        else break
    }

    // Check down
    for (let row = cell.row + 1; row < cell.row + GRID_SIZE; row++) {
        const check = grid[row % GRID_SIZE][cell.col]
        if (check === 0) continue
        if (check === value || check + value === 10) return false
        else break
    }

    // Check up left diagonal
    for (let row = cell.row - 1, col = cell.col - 1; row >= 0 && col >= 0; row--, col--) {
        const check = grid[row][col]
        if (check === 0) continue
        if (check === value || check + value === 10) return false
        else break
    }

    // Check up right diagonal
    for (let row = cell.row - 1, col = cell.col + 1; row >= 0 && col < GRID_SIZE; row--, col++) {
        const check = grid[row][col]
        if (check === 0) continue
        if (check === value || check + value === 10) return false
        else break
    }

    // Check down left diagonal
    for (let row = cell.row + 1, col = cell.col - 1; row < GRID_SIZE && col >= 0; row++, col--) {
        const check = grid[row][col]
        if (check === 0) continue
        if (check === value || check + value === 10) return false
        else break
    }

    // Check down right diagonal
    for (let row = cell.row + 1, col = cell.col + 1; row < GRID_SIZE && col < GRID_SIZE; row++, col++) {
        const check = grid[row][col]
        if (check === 0) continue
        if (check === value || check + value === 10) return false
        else break
    }

    return true
}
