declare module '*.css'
declare module '*.wav'
declare module '*.png'

declare namespace NodeJS {
    type Timeout = ReturnType<typeof setTimeout>
}
