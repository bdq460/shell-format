"use strict";
/**
 * Spawn 错误处理工具模块
 * 提供统一的子进程执行错误处理逻辑
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.SpawnErrorType = void 0;
exports.createSpawnErrorDiagnostic = createSpawnErrorDiagnostic;
exports.classifySpawnError = classifySpawnError;
exports.formatErrorLogMessage = formatErrorLogMessage;
const vscode = __importStar(require("vscode"));
const messages_1 = require("./messages");
/**
 * 错误类型
 */
var SpawnErrorType;
(function (SpawnErrorType) {
    /** 命令未找到（未安装） */
    SpawnErrorType["COMMAND_NOT_FOUND"] = "COMMAND_NOT_FOUND";
    /** 权限不足 */
    SpawnErrorType["PERMISSION_DENIED"] = "PERMISSION_DENIED";
    /** 命令执行错误 */
    SpawnErrorType["EXECUTION_ERROR"] = "EXECUTION_ERROR";
})(SpawnErrorType || (exports.SpawnErrorType = SpawnErrorType = {}));
/**
 * 生成可执行的诊断信息
 * @param document 文档对象
 * @param commandName 命令名称（如 'shellcheck', 'shfmt'）
 * @param fullCommand 完整的执行命令字符串
 * @param err 错误对象
 * @returns 诊断对象
 */
function createSpawnErrorDiagnostic(document, commandName, fullCommand, err) {
    const errorType = classifySpawnError(err);
    let message;
    switch (errorType) {
        case SpawnErrorType.COMMAND_NOT_FOUND: { // 命令未找到
            message = messages_1.ToolNotInstalledMessage[commandName] ||
                `${commandName} not installed. Install it to enable shell script analysis.`;
            break;
        }
        case SpawnErrorType.PERMISSION_DENIED: { // 权限不足
            message = (0, messages_1.PermissionDeniedMessage)(commandName);
            break;
        }
        case SpawnErrorType.EXECUTION_ERROR: { // 命令执行错误
            message = (0, messages_1.ExecutionErrorMessage)(commandName, err.message);
            break;
        }
    }
    // 在文件第一行显示错误
    const lineRange = document.lineCount > 0 ? document.lineAt(0).range : new vscode.Range(0, 0, 0, 0);
    const fullMessage = `${message}\n\nCommand: ${fullCommand}`;
    const diagnostic = new vscode.Diagnostic(lineRange, fullMessage, vscode.DiagnosticSeverity.Error);
    diagnostic.code = `${commandName}-execution-error`;
    diagnostic.source = commandName;
    return diagnostic;
}
/**
 * 分类 spawn 错误类型
 * @param err 错误对象
 * @returns 错误类型
 */
function classifySpawnError(err) {
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
function formatErrorLogMessage(commandName, err) {
    const errorType = classifySpawnError(err);
    const typeMessage = {
        [SpawnErrorType.COMMAND_NOT_FOUND]: 'not installed',
        [SpawnErrorType.PERMISSION_DENIED]: 'permission denied',
        [SpawnErrorType.EXECUTION_ERROR]: 'execution error'
    }[errorType];
    return `${commandName} ${typeMessage}: ${err.message}`;
}
//# sourceMappingURL=spawnErrorHandler.js.map