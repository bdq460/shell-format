/**
 * 基础类型定义
 * 与业务无关，与 VSCode 无关
 */
import { Logger } from '../../utils/log';

/**
 * 取消令牌接口
 * 抽象取消机制，不依赖 VSCode
 */
export interface CancellationToken {
    readonly isCancellationRequested: boolean;
    onCancellationRequested(callback: () => void): void;
}

/**
 * 执行选项
 */
export interface ExecutorOptions {
    /** 命令参数 */
    args: string[];
    /** 取消令牌 */
    token?: CancellationToken;
    /** 日志记录器 */
    logger?: Logger;
}

/**
 * 执行结果
 */
export interface ExecutionResult {
    /** 退出码 */
    exitCode: number | null;
    /** 标准输出 */
    stdout: string;
    /** 标准错误 */
    stderr: string;
}
