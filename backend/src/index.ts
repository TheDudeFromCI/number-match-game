import { startGameServer } from './server.js'

void startGameServer()
    .then(({ url }) => {
        console.log(`Server running at ${url}`)
    })
    .catch((error: unknown) => {
        console.error('Failed to start server', error)
        process.exitCode = 1
    })
