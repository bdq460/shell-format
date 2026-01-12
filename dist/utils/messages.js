"use strict";
/**
 * 用户可见消息模块
 * 统一管理显示给用户的提示信息
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.FormatIssueMessage = exports.ExecutionErrorMessage = exports.PermissionDeniedMessage = exports.ToolNotInstalledMessage = void 0;
/**
 * 工具未安装提示
 */
exports.ToolNotInstalledMessage = {
    shellcheck: `Shellcheck not installed. Install it to enable shell script analysis.\n\nmacOS: brew install shellcheck\nLinux: sudo apt-get install shellcheck\nOr visit: https://github.com/koalaman/shellcheck`,
    shfmt: `Shfmt not installed. Install it to enable shell script formatting.\n\nmacOS: brew install shfmt\nLinux: sudo apt-get install shfmt\nOr visit: https://github.com/mvdan/sh`
};
/**
 * 权限不足提示
 */
const PermissionDeniedMessage = (tool) => `Permission denied when running ${tool}. Please check file permissions.`;
exports.PermissionDeniedMessage = PermissionDeniedMessage;
/**
 * 执行错误提示
 */
const ExecutionErrorMessage = (tool, errorMessage) => `Failed to run ${tool}: ${errorMessage}`;
exports.ExecutionErrorMessage = ExecutionErrorMessage;
/**
 * 格式问题提示
 */
exports.FormatIssueMessage = 'Shell script has formatting issues. Run "Fix all with shfmt" to fix.';
//# sourceMappingURL=messages.js.map