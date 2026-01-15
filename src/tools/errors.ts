/**
 * 工具执行错误类
 * 在创建时就根据错误码生成友好的错误消息
 */

/**
 * 工具执行错误
 * 当外部命令执行失败时抛出，包含完整的命令信息用于诊断
 */
export class ToolExecutionError extends Error {
    public readonly command: string;
    public readonly exitCode?: number;
    public readonly originalError?: Error;

    /**
     * @param originalError 原始错误对象
     * @param command 完整的命令字符串（如 'shfmt -i 2 -bn -ci -sr'）
     */
    constructor(
        originalError: NodeJS.ErrnoException,
        command: string
    ) {
        const message = ToolExecutionError.generateErrorMessage(originalError, command);
        super(message);
        this.name = 'ToolExecutionError';
        this.command = command;
        this.originalError = originalError;
        Object.setPrototypeOf(this, ToolExecutionError.prototype);
        this.stack = originalError.stack;
    }

    /**
     * 生成错误消息
     * @param error 原始错误
     * @param command 完整命令
     * @returns 错误消息
     */
    private static generateErrorMessage(error: NodeJS.ErrnoException, command: string): string {
        const commandName = command.split(' ')[0];

        switch (error.code) {
            case 'ENOENT':
                return `${commandName} not installed`;
            case 'EACCES':
                return `Permission denied when running ${commandName}`;
            default:
                return `Failed to run ${commandName}: ${error.message}`;
        }
    }
}
