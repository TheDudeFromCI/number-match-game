export const GRID_SIZE = 9
export const MIN_DIGIT = 1
export const MAX_DIGIT = 9

/** A single game instance tracked by the server. Only one instance exists at a time. */
export interface GameInstance {
    /** 9x9 grid of digits (1-9). A value of 0 means the cell has been matched and cleared. */
    grid: number[][]
    /** The player's current score. */
    score: number
    /** Timestamp (ms since epoch) when the game instance was created. */
    createdAt: number
    /** Timestamp (ms since epoch) when the game instance was last updated. */
    updatedAt: number
}

/** Generates a new `size` x `size` grid filled with random digits between `MIN_DIGIT` and `MAX_DIGIT`. */
export function createRandomGrid(size: number = GRID_SIZE): number[][] {
    const grid: number[][] = []

    for (let row = 0; row < size; row++) {
        const rowValues: number[] = []

        for (let col = 0; col < size; col++) {
            rowValues.push(Math.floor(Math.random() * (MAX_DIGIT - MIN_DIGIT + 1)) + MIN_DIGIT)
        }

        grid.push(rowValues)
    }

    return grid
}

/** Checks whether `grid` is a valid `size` x `size` grid of digits between `MIN_DIGIT` and `MAX_DIGIT`, or 0. */
export function isValidGrid(grid: unknown, size: number = GRID_SIZE): grid is number[][] {
    if (!Array.isArray(grid) || grid.length !== size) {
        return false
    }

    return grid.every(
        (row) =>
            Array.isArray(row) &&
            row.length === size &&
            row.every((value) => Number.isInteger(value) && value >= 0 && value <= MAX_DIGIT),
    )
}
