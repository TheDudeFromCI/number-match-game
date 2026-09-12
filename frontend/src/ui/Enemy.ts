import '../css/enemy.css'
import { EventEmitter } from 'events'

export const MAX_RAGE = 10

export enum EnemyState {
    Idle = 'idle',
    Damage = 'damage',
    Rage = 'rage',
    Attack = 'attack',
}

export interface EnemyProfile {
    name: string
    health: number
}

export enum EnemyType {
    BananaVirus = 'banana-virus',
}

export const EnemyProfiles: Record<EnemyType, EnemyProfile> = {
    [EnemyType.BananaVirus]: {
        name: 'Banana Virus',
        health: 100,
    },
}

export class Enemy extends EventEmitter {
    private readonly htmlElement: HTMLDivElement
    private readonly avatar: HTMLDivElement
    private animTimer: NodeJS.Timeout | null = null

    private _name: string
    private _enemy: EnemyType
    private _health: number
    private _maxHealth: number
    private _rage: number = 0
    private _state: EnemyState = EnemyState.Idle

    public constructor(enemy: EnemyType) {
        super()

        const profile = EnemyProfiles[enemy]

        this._name = profile.name
        this._enemy = enemy
        this._health = profile.health
        this._maxHealth = profile.health

        this.htmlElement = document.createElement('div')
        this.htmlElement.classList.add('enemy-container')

        const nametag = document.createElement('div')
        nametag.classList.add('enemy-name')
        nametag.textContent = this._name
        this.htmlElement.appendChild(nametag)

        this.avatar = document.createElement('div')
        this.avatar.classList.add('enemy', 'sprite')
        this.avatar.setAttribute('enemy', this._enemy)
        this.avatar.setAttribute('enemy-state', this._state)
        this.avatar.setAttribute('enemy-frame', '0')
        this.htmlElement.appendChild(this.avatar)

        const healthBar = document.createElement('div')
        healthBar.classList.add('enemy-health-bar')
        this.htmlElement.appendChild(healthBar)

        const healthBarFill = document.createElement('div')
        healthBarFill.classList.add('enemy-health-bar-fill')
        healthBarFill.style.width = `100%`
        healthBar.appendChild(healthBarFill)

        this.on('damage', () => {
            healthBarFill.style.width = `${(this._health / this._maxHealth) * 100}%`
            this.state = EnemyState.Damage
            setTimeout(() => {
                if (this._rage >= MAX_RAGE) {
                    this.state = EnemyState.Rage
                } else {
                    this.state = EnemyState.Idle
                }
            }, 1000)
        })

        this.resetAnimation()

        setInterval(() => {
            this.takeDamage(Math.floor(Math.random() * 10) + 1)
        }, 5050)
    }

    public get name(): string {
        return this._name
    }

    public get enemy(): EnemyType {
        return this._enemy
    }

    public get health(): number {
        return this._health
    }

    public get maxHealth(): number {
        return this._maxHealth
    }

    public get rage(): number {
        return this._rage
    }

    public get rootElement(): HTMLDivElement {
        return this.htmlElement
    }

    public get state(): EnemyState {
        return this._state
    }

    public set state(newState: EnemyState) {
        if (this._state === newState) return

        this._state = newState
        this.avatar.setAttribute('enemy-state', newState)
        this.resetAnimation()

        this.emit('stateChange', newState)
    }

    public takeDamage(damage: number): void {
        this._health -= damage
        if (this._health < 0) {
            this._health = 0
            this.emit('defeated')
        } else {
            this._rage += 1
            this.emit('damage', damage)
        }
    }

    public dispose(): void {
        if (this.animTimer !== null) {
            clearInterval(this.animTimer)
            this.animTimer = null
        }
    }

    private resetAnimation(): void {
        this.avatar.setAttribute('enemy-frame', '0')

        if (this.animTimer !== null) {
            clearInterval(this.animTimer)
            this.animTimer = null
        }

        let frame = 0
        this.animTimer = setInterval(() => {
            frame = (frame + 1) % 2
            this.avatar.setAttribute('enemy-frame', frame.toString())
        }, 500)
    }
}
