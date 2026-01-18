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
    onCancellationRequested(callback: () => void): Disposable | void;
}

/**
 * 可释放对象接口
 */
export interface Disposable {
    dispose(): void;
}

/**
 * 执行选项
 */
export interface ExecutorOptions {
    /** 命令参数 */
    args: string[];
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
