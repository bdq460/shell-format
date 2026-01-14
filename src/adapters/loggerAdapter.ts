/**
 * 适配日志系统到基础层接口
 */

import { Logger } from '../tools/executor';
import { log } from '../utils/logger';

/**
 * 日志适配器
 * 将插件日志系统适配到基础层 Logger 接口
 */
export class LoggerAdapter implements Logger {
    info(message: string): void {
        log(message);
    }

    error(message: string): void {
        log(message);
    }
}
