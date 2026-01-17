/**
 * 默认日志记录器
 */
export let logger: Logger;

/**
 * 设置日志记录器
 * @param log 日志记录器
 */
export function setLogger(log: Logger) {
    console.log("Set logger");
    if (!logger) {
        console.log("logger is null set by param");
        logger = log;
    }
}

/**
 * 日志记录器接口
 * 允许外部传入日志实现，不依赖具体日志系统
 */
export interface Logger {
    info(message: string): void;
    warn(message: string): void;
    error(message: string): void;
    debug?(message: string): void;
}
