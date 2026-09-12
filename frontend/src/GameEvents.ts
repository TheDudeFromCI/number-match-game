import type { GameInstance } from 'cis-number-matcher-common'
import type { Pos } from './Game'

export interface GameEvents {
    onGameLoaded(game: GameInstance): Promise<void>
    onDeadEnd(_game: GameInstance): Promise<void>
    onCellSelected(cell: Pos, selected: boolean): Promise<void>
    onScoreUp(score: number, increment: number): Promise<void>
    onTopScoreUp(topScore: number, isNewTopScore: boolean): Promise<void>
    onLineClear(row: number, newRow: number[]): Promise<void>
    onDualLineClear(row1: number, row2: number, newRows: number[][]): Promise<void>
    onClearCells(cells: Pos[]): Promise<void>
}
