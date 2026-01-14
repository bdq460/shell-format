/**
 * 基础类型定义
 * 与业务无关，与 VSCode 无关
 */

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
    /** 要执行的命令路径 */
    command: string;
    /** 命令参数 */
    args: string[];
    /** 输入内容 */
    input: string;
    /** 取消令牌 */
    token?: CancellationToken;
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

/**
 * 日志记录器接口
 * 允许外部传入日志实现，不依赖具体日志系统
 */
export interface Logger {
    info(message: string): void;
    error(message: string): void;
    debug?(message: string): void;
}
