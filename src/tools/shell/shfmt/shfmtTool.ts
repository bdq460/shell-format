/**
 * shfmt 工具类
 * 封装 shfmt 的所有操作
 */

import { execute, Logger } from '../../executor';
import { ToolResult } from '../../types';
import { parseShfmtOutput } from './parser';

/**
 * shfmt 工具类
 */
export class ShfmtTool {
    /**
     * 格式化 Shell 脚本
     */
    async format(
        content: string,
        options: ShfmtFormatOptions
    ): Promise<ToolResult> {
        const args = this.buildFormatArgs(options);
        const result = await execute({
            command: options.commandPath || 'shfmt',
            args,
            input: content
        }, options.logger);

        return parseShfmtOutput(result, content, 'format');
    }

    /**
     * 检查格式
     */
    async check(
        content: string,
        options: ShfmtCheckOptions
    ): Promise<ToolResult> {
        const args = this.buildCheckArgs(options);
        const result = await execute({
            command: options.commandPath || 'shfmt',
            args,
            input: content
        }, options.logger);

        return parseShfmtOutput(result, content, 'check');
    }

    /**
     * 构建格式化参数
     */
    private buildFormatArgs(options: ShfmtFormatOptions): string[] {
        const args: string[] = [];

        if (options.indent !== undefined) {
            args.push('-i', options.indent.toString());
        }
        if (options.binaryNextLine) args.push('-bn');
        if (options.caseIndent) args.push('-ci');
        if (options.spaceRedirects) args.push('-sr');

        return args;
    }

    /**
     * 构建检查参数
     */
    private buildCheckArgs(options: ShfmtCheckOptions): string[] {
        const args = this.buildFormatArgs(options);
        args.push('-d'); // 检查模式
        return args;
    }
}

/**
 * shfmt 格式化选项
 */
export interface ShfmtFormatOptions {
    /** shfmt 可执行文件路径 */
    commandPath?: string;
    /** 缩进空格数 */
    indent?: number;
    /** 二元操作符换行 */
    binaryNextLine?: boolean;
    /** case 语句缩进 */
    caseIndent?: boolean;
    /** 重定向操作符添加空格 */
    spaceRedirects?: boolean;
    /** 日志记录器 */
    logger?: Logger;
}

/**
 * shfmt 检查选项
 */
export interface ShfmtCheckOptions extends ShfmtFormatOptions { }
