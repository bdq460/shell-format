/**
 * 解析 shfmt 输出
 */

import { ExecutionResult } from '../../executor';
import { SyntaxError, ToolResult } from '../../types';

/**
 * 解析 shfmt 输出
 * @param result 执行结果
 * @param originalContent 原始内容
 * @param mode 模式：format 或 check
 * @returns 工具结果
 */
export function parseShfmtOutput(
    result: ExecutionResult,
    originalContent: string,
    mode: 'format' | 'check'
): ToolResult {
    // 成功：返回格式化内容
    if (result.exitCode === 0) {
        return {
            success: true,
            formattedContent: result.stdout
        };
    }

    // 解析语法错误
    const syntaxErrors = parseSyntaxErrors(result.stderr);
    if (syntaxErrors.length > 0) {
        return {
            success: false,
            syntaxErrors
        };
    }

    // 解析格式问题（仅检查模式）
    if (mode === 'check' && result.stdout.trim()) {
        return {
            success: false,
            formatIssues: [{ diff: result.stdout }]
        };
    }

    // 未知错误
    return { success: false };
}

/**
 * 解析语法错误
 * 格式: <standard input>:14:1: if statement must end with "fi"
 * @param stderr 标准错误输出
 * @returns 语法错误数组
 */
function parseSyntaxErrors(stderr: string): SyntaxError[] {
    const errors: SyntaxError[] = [];
    const match = stderr.match(/<standard input>:(\d+):(\d+): (.+)/);

    if (match) {
        errors.push({
            line: parseInt(match[1], 10) - 1,
            column: parseInt(match[2], 10) - 1,
            message: match[3]
        });
    }

    return errors;
}
