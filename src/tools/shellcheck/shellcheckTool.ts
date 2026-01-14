/**
 * shellcheck 工具类
 */

import { execute, Logger } from '../../executor';
import { ToolResult } from '../types';
import { parseShellcheckOutput } from './parser';

/**
 * shellcheck 工具类
 */
export class ShellcheckTool {
    /**
     * 检查 Shell 脚本
     */
    async check(
        content: string,
        options: ShellcheckOptions
    ): Promise<ToolResult> {
        const args = ['-f', 'gcc'];
        const result = await execute({
            command: options.commandPath || 'shellcheck',
            args,
            input: content
        }, options.logger);

        return parseShellcheckOutput(result);
    }
}

/**
 * shellcheck 检查选项
 */
export interface ShellcheckOptions {
    /** shellcheck 可执行文件路径 */
    commandPath?: string;
    /** 日志记录器 */
    logger?: Logger;
}
