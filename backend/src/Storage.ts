import fs from 'fs/promises'
import type { GameInstance } from 'cis-number-matcher-common'

export class Storage {
    private readonly filePath: string

    constructor(filePath: string) {
        this.filePath = filePath
    }

    async readGameInstance(): Promise<GameInstance | null> {
        try {
            const data = await fs.readFile(this.filePath, 'utf-8')
            return JSON.parse(data) as GameInstance
        } catch (error) {
            if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
                return null
            }
            throw error
        }
    }

    async writeGameInstance(gameInstance: GameInstance): Promise<void> {
        const data = JSON.stringify(gameInstance, null, 2)
        await fs.writeFile(this.filePath, data, 'utf-8')
    }

    async deleteGameInstance(): Promise<void> {
        try {
            await fs.unlink(this.filePath)
        } catch (error) {
            if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
                throw error
            }
        }
    }
}
