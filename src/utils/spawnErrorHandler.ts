/**
 * Spawn 错误处理工具模块
 * 提供统一的子进程执行错误处理逻辑
 */

import * as vscode from 'vscode';
import {
    ExecutionErrorMessage,
    PermissionDeniedMessage,
    ToolNotInstalledMessage
} from './messages';

/**
 * 错误类型
 */
export enum SpawnErrorType {
    /** 命令未找到（未安装） */
    COMMAND_NOT_FOUND = 'COMMAND_NOT_FOUND',
    /** 权限不足 */
    PERMISSION_DENIED = 'PERMISSION_DENIED',
    /** 命令执行错误 */
    EXECUTION_ERROR = 'EXECUTION_ERROR'
}

/**
 * 生成可执行的诊断信息
 * @param document 文档对象
 * @param commandName 命令名称（如 'shellcheck', 'shfmt'）
 * @param fullCommand 完整的执行命令字符串
 * @param err 错误对象
 * @returns 诊断对象
 */
export function createSpawnErrorDiagnostic(
    document: vscode.TextDocument,
    commandName: string,
    fullCommand: string,
    err: NodeJS.ErrnoException
): vscode.Diagnostic | null {
    const errorType = classifySpawnError(err);

    let message: string;
    switch (errorType) {
        case SpawnErrorType.COMMAND_NOT_FOUND: { // 命令未找到
            message = ToolNotInstalledMessage[commandName as keyof typeof ToolNotInstalledMessage] ||
                `${commandName} not installed. Install it to enable shell script analysis.`;
            break;
        }
        case SpawnErrorType.PERMISSION_DENIED: { // 权限不足
            message = PermissionDeniedMessage(commandName);
            break;
        }
        case SpawnErrorType.EXECUTION_ERROR: { // 命令执行错误
            message = ExecutionErrorMessage(commandName, err.message);
            break;
        }
    }

    // 在文件第一行显示错误
    const lineRange = document.lineCount > 0 ? document.lineAt(0).range : new vscode.Range(0, 0, 0, 0);
    const fullMessage = `${message}\n\nCommand: ${fullCommand}`;

    const diagnostic = new vscode.Diagnostic(
        lineRange,
        fullMessage,
        vscode.DiagnosticSeverity.Error
    );
    diagnostic.code = `${commandName}-execution-error`;
    diagnostic.source = commandName;
    return diagnostic;
}

/**
 * 分类 spawn 错误类型
 * @param err 错误对象
 * @returns 错误类型
 */
export function classifySpawnError(err: NodeJS.ErrnoException): SpawnErrorType {
    if (err.code === 'ENOENT') {
        return SpawnErrorType.COMMAND_NOT_FOUND;
    }
    if (err.code === 'EACCES') {
        return SpawnErrorType.PERMISSION_DENIED;
    }
    return SpawnErrorType.EXECUTION_ERROR;
}

/**
 * 格式化错误信息用于日志
 * @param commandName 命令名称
 * @param err 错误对象
 * @returns 格式化的错误信息
 */
export function formatErrorLogMessage(commandName: string, err: NodeJS.ErrnoException): string {
    const errorType = classifySpawnError(err);
    const typeMessage = {
        [SpawnErrorType.COMMAND_NOT_FOUND]: 'not installed',
        [SpawnErrorType.PERMISSION_DENIED]: 'permission denied',
        [SpawnErrorType.EXECUTION_ERROR]: 'execution error'
    }[errorType];

    return `${commandName} ${typeMessage}: ${err.message}`;
}
