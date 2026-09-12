import '../css/grid.css'

import { GRID_SIZE } from 'cis-number-matcher-common'
import { Cell } from './Cell.js'
import type { Pos } from '../Game'
import { EventEmitter } from 'events'

export class Grid extends EventEmitter {
    public readonly rootElement: HTMLDivElement

    private cells: Cell[][]

    constructor() {
        super()

        this.rootElement = document.createElement('div')
        this.rootElement.classList.add('grid')
        document.body.appendChild(this.rootElement)

        this.cells = []
        for (let row = 0; row < GRID_SIZE; row++) {
            const rowCells: Cell[] = []
            for (let col = 0; col < GRID_SIZE; col++) {
                const cell = new Cell(row, col, 0)
                rowCells.push(cell)

                this.rootElement.appendChild(cell.htmlElement)
                cell.htmlElement.addEventListener('click', () => this.emit('cellClick', row, col))
            }
            this.cells.push(rowCells)
        }
    }

    public updateCells(values: number[][]): void {
        for (let row = 0; row < GRID_SIZE; row++) {
            for (let col = 0; col < GRID_SIZE; col++) {
                this.cells[row][col].value = values[row][col]
                this.cells[row][col].selected = false
                this.cells[row][col].disabled = false
            }
        }
    }

    public getCell(cell: Pos): Cell {
        return this.cells[cell.row][cell.col]
    }

    public async clearRow(row: number, newCells: number[]): Promise<void> {
        for (let r = row; r >= 0; r--) {
            for (let col = 0; col < GRID_SIZE; col++) {
                this.cells[r][col].value = this.cells[r - 1]?.[col]?.value ?? newCells[col]
            }
        }
    }

    public async gameOver(): Promise<void> {
        for (let row = 0; row < GRID_SIZE; row++) {
            for (let col = 0; col < GRID_SIZE; col++) {
                this.cells[row][col].disabled = true
            }
        }
    }
}
