/**
 * 工具层类型定义
 * 定义工具的统一接口和数据结构
 */

/**
 * 工具检查结果
 */
export interface ToolResult {
    success: boolean;
    syntaxErrors?: SyntaxError[];
    formatIssues?: FormatIssue[];
    linterIssues?: LinterIssue[];
    formattedContent?: string;
}

/**
 * 语法错误
 */
export interface SyntaxError {
    line: number;      // 0-based
    column: number;    // 0-based
    message: string;
}

/**
 * 格式问题
 */
export interface FormatIssue {
    diff: string;
}

/**
 * 代码检查问题
 */
export interface LinterIssue {
    line: number;
    column: number;
    type: 'error' | 'warning' | 'info';
    code: string;
    message: string;
}
