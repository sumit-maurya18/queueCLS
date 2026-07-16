export enum LogLevel {
    INFO = "INFO",
    WARN = "WARN",
    ERROR = "ERROR",
    SUCCESS = "SUCCESS"
}

export class Logger {

    private static format(level: LogLevel, message: string): string {

        const timestamp = new Date().toISOString();

        return `[${timestamp}] [${level}] ${message}`;
    }

    static info(message: string): void {

        console.log(this.format(LogLevel.INFO, message));

    }

    static warn(message: string): void {

        console.warn(this.format(LogLevel.WARN, message));

    }

    static error(message: string): void {

        console.error(this.format(LogLevel.ERROR, message));

    }

    static success(message: string): void {

        console.log(this.format(LogLevel.SUCCESS, message));

    }

}