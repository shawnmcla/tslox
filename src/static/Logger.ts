export interface Logger {
    log(...message: any[]): void;
    error(...message: any[]):void;
    debug(...message: any[]): void;
}

