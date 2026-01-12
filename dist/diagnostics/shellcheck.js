"use strict";
/**
 * Shellcheck 诊断模块
 * 使用 shellcheck 检测 Shell 脚本的语法和最佳实践问题
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
exports.checkWithShellcheck = checkWithShellcheck;
const child_process_1 = require("child_process");
const vscode = __importStar(require("vscode"));
const logger_1 = require("../utils/logger");
const shell_1 = require("../utils/shell");
const spawnErrorHandler_1 = require("../utils/spawnErrorHandler");
/**
 * 使用 shellcheck 进行语法和最佳实践检查
 * @param document 文档对象
 * @returns 诊断数组
 */
async function checkWithShellcheck(document) {
    const diagnostics = [];
    return new Promise((resolve) => {
        (0, logger_1.log)(`Checking with shellcheck for: ${document.fileName}`);
        const command = 'shellcheck';
        const args = ['-f', 'gcc', document.fileName];
        const fullCommand = `${command} ${args.join(' ')}`;
        // 使用spawn执行shell命令, 用于异步启动子进程
        // 为什么使用 spawn？
        // 1. 流式处理输出: shellcheck 的输出可能很大，spawn 允许实时处理数据流
        // 2. 没有缓冲区限制: exec 有默认的 1MB 缓冲区限制，而 spawn 使用流，可以处理任意大小的输出。
        // 3. 可以实时监听进程事件。
        // 4. 可取消: spawn 支持取消，exec 不支持。
        // 5. 子进程shell执行失败, vscode不会报错。
        (0, logger_1.log)(`Execute command: ${fullCommand}`);
        const shellcheck = (0, child_process_1.spawn)(command, args);
        const stdout = [];
        const stderr = [];
        shellcheck.stdout.on('data', (chunk) => {
            stdout.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
        });
        shellcheck.stderr.on('data', (chunk) => {
            stderr.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
        });
        shellcheck.on('close', (code) => {
            (0, shell_1.logShellCommandCloseOutput)(fullCommand, stdout, stderr, code);
            const allOutput = Buffer.concat([...stdout, ...stderr]).toString();
            if (code !== 0 && allOutput.length > 0) {
                (0, logger_1.log)(`Shellcheck found issues for: ${document.fileName}`);
                const parsed = parseShellcheckOutput(document, allOutput);
                diagnostics.push(...parsed);
            }
            else {
                if (code === 0) {
                    (0, logger_1.log)(`Shellcheck passed for: ${document.fileName}`);
                }
                else {
                    (0, logger_1.log)(`Shellcheck failed for: ${document.fileName} (exit code: ${code})`);
                }
            }
            resolve(diagnostics);
        });
        shellcheck.on('error', (err) => {
            (0, shell_1.logShellCommandErrorOutput)(fullCommand, stdout, stderr, err);
            const errorMessage = (0, spawnErrorHandler_1.formatErrorLogMessage)('shellcheck', err);
            (0, logger_1.log)(errorMessage);
            const errorDiagnostic = (0, spawnErrorHandler_1.createSpawnErrorDiagnostic)(document, 'shellcheck', fullCommand, err);
            if (errorDiagnostic) {
                diagnostics.push(errorDiagnostic);
                (0, logger_1.log)(`Created diagnostic for shellcheck error at line 0`);
            }
            resolve(diagnostics);
        });
    });
}
/**
 * 解析 shellcheck 输出
 * @param document 文档对象
 * @param output shellcheck 输出
 * @returns 诊断数组
 */
function parseShellcheckOutput(document, output) {
    const diagnostics = [];
    const lines = output.split('\n');
    for (const line of lines) {
        if (!line.trim())
            continue;
        // 优先尝试 GCC 格式
        let errorMatch = line.match(/^(.+?):(\d+):(\d+): (error|warning|note): (.+) \[(SC\d+)\]$/);
        if (errorMatch) {
            const [, , lineNum, colNum, type, message, scCode] = errorMatch;
            const lineNumber = parseInt(lineNum, 10) - 1;
            const column = parseInt(colNum, 10) - 1;
            if (lineNumber >= 0 && lineNumber < document.lineCount) {
                // const lineRange = document.lineAt(lineNumber).range;
                const errorRange = new vscode.Range(lineNumber, column, lineNumber, column + 1);
                const diagnostic = new vscode.Diagnostic(errorRange, `${scCode}: ${message}`, type === 'error' ? vscode.DiagnosticSeverity.Error :
                    type === 'warning' ? vscode.DiagnosticSeverity.Warning :
                        vscode.DiagnosticSeverity.Information);
                diagnostic.code = scCode;
                diagnostic.source = 'shellcheck';
                diagnostics.push(diagnostic);
                (0, logger_1.log)(`Added shellcheck diagnostic at line ${lineNumber + 1}: ${scCode} - ${message}`);
            }
            continue;
        }
        // 尝试默认格式
        errorMatch = line.match(/In (.+?) line (\d+):/);
        if (errorMatch) {
            const [, , lineNum] = errorMatch;
            const lineNumber = parseInt(lineNum, 10) - 1;
            if (lineNumber >= 0 && lineNumber < document.lineCount) {
                const lineRange = document.lineAt(lineNumber).range;
                const diagnostic = new vscode.Diagnostic(lineRange, line.trim(), vscode.DiagnosticSeverity.Error);
                diagnostic.code = 'shellcheck-error';
                diagnostic.source = 'shellcheck';
                diagnostics.push(diagnostic);
                (0, logger_1.log)(`Added shellcheck diagnostic at line ${lineNumber + 1}`);
            }
        }
    }
    return diagnostics;
}
//# sourceMappingURL=shellcheck.js.map