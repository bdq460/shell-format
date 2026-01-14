/**
 * 解析 shellcheck 输出
 */

import { ExecutionResult } from '../../executor';
import { ToolResult, LinterIssue } from '../types';

/**
 * 解析 shellcheck 输出
 * @param result 执行结果
 * @returns 工具结果
 */
export function parseShellcheckOutput(result: ExecutionResult): ToolResult {
    const allOutput = `${result.stdout}${result.stderr}`;

    if (!allOutput.trim()) {
        return { success: true };
    }

    const linterIssues = parseIssues(allOutput);
    return {
        success: false,
        linterIssues
    };
}

/**
 * 解析 shellcheck 问题
 * 格式: file:line:column: type: message [SCxxxx]
 * @param output 输出内容
 * @returns 问题数组
 */
function parseIssues(output: string): LinterIssue[] {
    const issues: LinterIssue[] = [];
    const lines = output.split('\n');

    for (const line of lines) {
        const match = line.match(/^.+?:(\d+):(\d+): (error|warning|note): (.+) \[(SC\d+)\]$/);

        if (match) {
            issues.push({
                line: parseInt(match[1], 10) - 1,
                column: parseInt(match[2], 10) - 1,
                type: match[3] as any,
                message: match[4],
                code: match[5]
            });
        }
    }

    return issues;
}
