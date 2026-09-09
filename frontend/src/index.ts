import { GRID_SIZE } from 'cis-number-matcher-common'
import './css/global.css'

import { Game } from './Game'
import { UI } from './UI'

const ui = new UI()

Game.loadGame().then((game) => {
    ui.render(game)

    ui.on('cellClick', (row: number, col: number) => {
        game.clickCell({ row, col })
        ui.render(game)
        ui.playSound('click')
    })

    ui.on('newGame', async () => {
        await game.resetGame()
        ui.render(game)
    })

    game.on('scoreUpdated', () => {
        ui.animateScoreUpdated()
        ui.playSound('scoreUp')
    })

    game.on('topScoreUpdated', ({ isNewTopScore }) => {
        ui.animateTopScoreUpdated()
        if (isNewTopScore) ui.playSound('highScore')
    })

    game.on('cellsCleared', ({ cells: [cellA, cellB], scoreIncrement }) => {
        ui.scoreUpEffect(cellA, scoreIncrement)
        ui.scoreUpEffect(cellB, scoreIncrement)
        ui.playSound('pop')
    })

    game.on('lineCleared', ({ movedCells, row, scoreIncrement }) => {
        ui.animateLineClear(movedCells)
        ui.scoreUpEffect({ row, col: GRID_SIZE }, scoreIncrement)
        ui.playSound('bigScoreUp')

        // for (let col = 0; col < GRID_SIZE; col++) {
        //     const cell = { row: movedCells[0]?.to.row ?? 0, col }
        //     ui.scoreUpEffect(cell, scoreIncrement)
        // }
    })

    game.on('deadEnd', () => {
        ui.playSound('gameOver')
        ui.render(game)
    })
})
