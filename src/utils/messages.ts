/**
 * 用户可见消息模块
 * 统一管理显示给用户的提示信息
 */

/**
 * 工具未安装提示
 */
export const ToolNotInstalledMessage = {
    shellcheck: `Shellcheck not installed. Install it to enable shell script analysis.\n\nmacOS: brew install shellcheck\nLinux: sudo apt-get install shellcheck\nOr visit: https://github.com/koalaman/shellcheck`,
    shfmt: `Shfmt not installed. Install it to enable shell script formatting.\n\nmacOS: brew install shfmt\nLinux: sudo apt-get install shfmt\nOr visit: https://github.com/mvdan/sh`
} as const;

/**
 * 权限不足提示
 */
export const PermissionDeniedMessage = (tool: string): string =>
    `Permission denied when running ${tool}. Please check file permissions.`;

/**
 * 执行错误提示
 */
export const ExecutionErrorMessage = (tool: string, errorMessage: string): string =>
    `Failed to run ${tool}: ${errorMessage}`;

/**
 * 格式问题提示
 */
export const FormatIssueMessage = 'Shell script has formatting issues. Run "Fix all with shfmt" to fix.';
