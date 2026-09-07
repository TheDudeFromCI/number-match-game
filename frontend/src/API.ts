import type { GameInstance } from 'cis-number-matcher-common'

export async function fetchGameInstance(): Promise<GameInstance | null> {
    try {
        const response = await fetch('/api/game')

        if (!response.ok) {
            return null
        }

        return (await response.json()) as GameInstance
    } catch (error) {
        console.error('Error fetching game instance:', error)
        return null
    }
}

export async function saveGameInstance(gameInstance: GameInstance): Promise<void> {
    try {
        const response = await fetch('/api/game', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(gameInstance),
        })

        if (!response.ok) {
            throw new Error(`Failed to save game instance: ${response.status}`)
        }
    } catch (error) {
        console.error('Error saving game instance:', error)
    }
}

export async function deleteGameInstance(): Promise<void> {
    try {
        const response = await fetch('/api/game', {
            method: 'DELETE',
        })

        if (!response.ok) {
            throw new Error(`Failed to delete game instance: ${response.status}`)
        }
    } catch (error) {
        console.error('Error deleting game instance:', error)
    }
}
