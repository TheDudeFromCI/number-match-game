import { createRandomGrid, GRID_SIZE, type GameInstance } from 'cis-number-matcher-common'
import { fetchGameInstance, saveGameInstance } from './API'
import { EventEmitter } from 'events'

export interface Cell {
    row: number
    col: number
}

export class Game extends EventEmitter {
    private _data: GameInstance
    private selected: Cell | null = null

    static async loadGame(): Promise<Game> {
        const gameInstance = await fetchGameInstance()

        if (!gameInstance) {
            return new Game(createNewGameInstance(0))
        }

        return new Game(gameInstance)
    }

    private constructor(data: GameInstance) {
        super()
        this._data = data

        if (this.checkIfDeadEnd()) {
            this.emit('deadEnd')
        }
    }

    selectCell(cell: Cell): void {
        this.selected = cell
    }

    deselectCell(): void {
        this.selected = null
    }

    get data(): Readonly<GameInstance> {
        return this._data
    }

    get selectedCell(): Cell | null {
        return this.selected
    }

    getCellValue(cell: Cell): number {
        return this._data.grid[cell.row]?.[cell.col] ?? 0
    }

    setCellValue(cell: Cell, value: number): void {
        if (!this._data.grid[cell.row]) {
            this._data.grid[cell.row] = []
        }
        this._data.grid[cell.row][cell.col] = value
        this._data.updatedAt = Date.now()
    }

    incrementScore(amount: number): void {
        const isNewTopScore =
            this._data.topScore > 0 &&
            this._data.score < this._data.topScore &&
            this._data.score + amount >= this._data.topScore

        this._data.score += amount
        this._data.updatedAt = Date.now()
        this.emit('scoreUpdated', { score: this._data.score, increment: amount })

        if (this._data.score > this._data.topScore || this._data.topScore == null) {
            this._data.topScore = this._data.score
            this.emit('topScoreUpdated', { topScore: this._data.topScore, isNewTopScore })
        }
    }

    async clickCell(target: Cell): Promise<void> {
        const value = this.getCellValue(target)
        if (value === 0) return

        if (!this.selected) {
            this.selectCell(target)
            return
        }

        if (matches(this.selected, target)) {
            this.deselectCell()
            return
        }

        if (this.attemptClear(this.selected, target)) {
            const minRow = Math.min(this.selected.row, target.row)
            const maxRow = Math.max(this.selected.row, target.row)

            if (minRow === maxRow) {
                const movedCells = this.checkLineClear(minRow)
                if (movedCells) {
                    this.emit('lineCleared', { scoreIncrement: 10, row: minRow, movedCells })
                }
            } else {
                const movedCellsA = this.checkLineClear(minRow)
                const movedCellsB = this.checkLineClear(maxRow)

                if (movedCellsA || movedCellsB) {
                    const movedCells = [...(movedCellsA ?? []), ...(movedCellsB ?? [])]
                    this.emit('lineCleared', { scoreIncrement: 10, row: maxRow, movedCells })
                }
            }

            this.deselectCell()
            await saveGameInstance(this._data)

            if (this.checkIfDeadEnd()) {
                this.emit('deadEnd')
            }
        } else {
            this.selectCell(target)
        }
    }

    private attemptClear(a: Cell, b: Cell): boolean {
        const aValue = this.getCellValue(a)
        const bValue = this.getCellValue(b)

        if (matches(a, b)) return false
        if (aValue === 0 || bValue === 0) return false
        if (!this.confirmPair(a, b)) return false

        if (this.checkRow(a, b)) return true
        if (this.checkRowWrap(a, b)) return true
        if (this.checkColumn(a, b)) return true
        if (this.checkColumnWrap(a, b)) return true
        if (this.checkLeftDiagonal(a, b)) return true
        if (this.checkRightDiagonal(a, b)) return true
        return false
    }

    private confirmPair(a: Cell, b: Cell): boolean {
        const aValue = this.getCellValue(a)
        const bValue = this.getCellValue(b)

        if (aValue === 0 || bValue === 0) return false
        if (aValue === bValue) return true
        return aValue + bValue === 10
    }

    private checkRow(a: Cell, b: Cell): boolean {
        if (a.row !== b.row) return false

        const min = Math.min(a.col, b.col)
        const max = Math.max(a.col, b.col)

        for (let col = min + 1; col < max; col++) {
            if (this.getCellValue({ row: a.row, col }) !== 0) {
                return false
            }
        }

        const score = 2 ** (max - min)
        this.setCellValue(a, 0)
        this.setCellValue(b, 0)
        this.incrementScore(score)
        this.emit('cellsCleared', { cells: [a, b], scoreIncrement: score })

        return true
    }

    private checkRowWrap(a: Cell, b: Cell): boolean {
        if (a.row !== b.row) return false

        const rowLength = this._data.grid[a.row].length
        const min = Math.min(a.col, b.col)
        const max = Math.max(a.col, b.col)

        for (let col = max + 1; col < rowLength; col++) {
            if (this.getCellValue({ row: a.row, col }) !== 0) {
                return false
            }
        }

        for (let col = 0; col < min; col++) {
            if (this.getCellValue({ row: a.row, col }) !== 0) {
                return false
            }
        }

        const score = 2 ** (rowLength - (max - min))
        this.setCellValue(a, 0)
        this.setCellValue(b, 0)
        this.incrementScore(score)
        this.emit('cellsCleared', { cells: [a, b], scoreIncrement: score })

        return true
    }

    private checkColumn(a: Cell, b: Cell): boolean {
        if (a.col !== b.col) return false

        const min = Math.min(a.row, b.row)
        const max = Math.max(a.row, b.row)

        for (let row = min + 1; row < max; row++) {
            if (this.getCellValue({ row, col: a.col }) !== 0) {
                return false
            }
        }

        const score = 2 ** (max - min)
        this.setCellValue(a, 0)
        this.setCellValue(b, 0)
        this.incrementScore(score)
        this.emit('cellsCleared', { cells: [a, b], scoreIncrement: score })

        return true
    }

    private checkColumnWrap(a: Cell, b: Cell): boolean {
        if (a.col !== b.col) return false

        const colLength = this._data.grid.length
        const min = Math.min(a.row, b.row)
        const max = Math.max(a.row, b.row)

        for (let row = max + 1; row < colLength; row++) {
            if (this.getCellValue({ row, col: a.col }) !== 0) {
                return false
            }
        }

        for (let row = 0; row < min; row++) {
            if (this.getCellValue({ row, col: a.col }) !== 0) {
                return false
            }
        }

        const score = 2 ** (colLength - (max - min))
        this.setCellValue(a, 0)
        this.setCellValue(b, 0)
        this.incrementScore(score)
        this.emit('cellsCleared', { cells: [a, b], scoreIncrement: score })

        return true
    }

    private checkLeftDiagonal(a: Cell, b: Cell): boolean {
        const rowDiff = b.row - a.row
        const colDiff = b.col - a.col

        if (Math.abs(rowDiff) !== Math.abs(colDiff)) return false

        const rowStep = rowDiff > 0 ? 1 : -1
        const colStep = colDiff > 0 ? 1 : -1

        let row = a.row + rowStep
        let col = a.col + colStep

        while (row !== b.row && col !== b.col) {
            if (this.getCellValue({ row, col }) !== 0) {
                return false
            }
            row += rowStep
            col += colStep
        }

        const score = 2 ** Math.abs(rowDiff)
        this.setCellValue(a, 0)
        this.setCellValue(b, 0)
        this.incrementScore(score)
        this.emit('cellsCleared', { cells: [a, b], scoreIncrement: score })

        return true
    }

    private checkRightDiagonal(a: Cell, b: Cell): boolean {
        const rowDiff = b.row - a.row
        const colDiff = b.col - a.col

        if (Math.abs(rowDiff) !== Math.abs(colDiff)) return false

        const rowStep = rowDiff > 0 ? 1 : -1
        const colStep = colDiff > 0 ? -1 : 1

        let row = a.row + rowStep
        let col = a.col + colStep

        while (row !== b.row && col !== b.col) {
            if (this.getCellValue({ row, col }) !== 0) {
                return false
            }
            row += rowStep
            col += colStep
        }

        const score = 2 ** Math.abs(rowDiff)
        this.setCellValue(a, 0)
        this.setCellValue(b, 0)
        this.incrementScore(score)
        this.emit('cellsCleared', { cells: [a, b], scoreIncrement: score })

        return true
    }

    private checkLineClear(row: number): Array<{ from: Cell; to: Cell }> | null {
        for (let col = 0; col < GRID_SIZE; col++) {
            if (this.getCellValue({ row, col }) !== 0) {
                return null
            }
        }

        const movedCells: Array<{ from: Cell; to: Cell }> = []

        // shift all rows above down by one
        for (let r = row; r > 0; r--) {
            for (let col = 0; col < GRID_SIZE; col++) {
                const fromCell = { row: r - 1, col }
                const toCell = { row: r, col }
                movedCells.push({ from: fromCell, to: toCell })
                const valueAbove = this.getCellValue(fromCell)
                this.setCellValue(toCell, valueAbove)
            }
        }

        // randomly fill the top row with new values
        for (let col = 0; col < GRID_SIZE; col++) {
            const newValue = Math.floor(Math.random() * 9) + 1
            this.setCellValue({ row: 0, col }, newValue)
            movedCells.push({ from: { row: -1, col }, to: { row: 0, col } })
        }

        this.incrementScore(10)
        return movedCells
    }

    async resetGame(): Promise<void> {
        this._data = createNewGameInstance(this._data.topScore)
        this.selected = null
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

function matches(a: Cell, b: Cell): boolean {
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

function isCellDeadEnd(cell: Cell, grid: number[][]): boolean {
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
