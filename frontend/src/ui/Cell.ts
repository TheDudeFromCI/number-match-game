import '../css/cell.css'
import '../css/sprites.css'
import '../sprites/number-cells.png'
import '../sprites/empty-cell.png'

export class Cell {
    public readonly htmlElement: HTMLDivElement

    private _row: number
    private _col: number
    private _value: number
    private _selected: boolean

    constructor(row: number, col: number, value: number) {
        this._row = row
        this._col = col
        this._value = value
        this._selected = false

        this.htmlElement = document.createElement('div')
        this.htmlElement.classList.add('sprite')
        this.value = value
    }

    get empty(): boolean {
        return this._value === 0
    }

    get isNumber(): boolean {
        return this._value > 0
    }

    get isPowerUp(): boolean {
        return this._value < 0
    }

    get value(): number {
        return this._value
    }

    set value(newValue: number) {
        this._value = newValue

        this.htmlElement.classList.toggle('number-cell', newValue > 0)
        this.htmlElement.classList.toggle('empty-cell', newValue === 0)
        this.htmlElement.setAttribute('cell-value', newValue.toString())
    }

    get row(): number {
        return this._row
    }

    get col(): number {
        return this._col
    }

    get selected(): boolean {
        return this._selected
    }

    set selected(isSelected: boolean) {
        this._selected = isSelected
        this.htmlElement.classList.toggle('selected-cell', isSelected)
    }

    set disabled(isDisabled: boolean) {
        this.htmlElement.classList.toggle('disabled', isDisabled)
    }
}
