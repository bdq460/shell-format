"use strict";
/**
 * Shfmt 格式检查模块
 * 使用 shfmt 检测格式问题
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
exports.checkFormat = checkFormat;
const child_process_1 = require("child_process");
const path = __importStar(require("path"));
const vscode = __importStar(require("vscode"));
const extensionInfo_1 = require("../utils/extensionInfo");
const logger_1 = require("../utils/logger");
const messages_1 = require("../utils/messages");
const shell_1 = require("../utils/shell");
const spawnErrorHandler_1 = require("../utils/spawnErrorHandler");
/**
 * 使用 shfmt 进行格式检查
 * @param document 文档对象
 * @returns 诊断数组
 */
async function checkFormat(document) {
    const fileName = path.basename(document.fileName);
    const diagnostics = [];
    return new Promise((resolve) => {
        (0, logger_1.log)(`Checking format for: ${fileName}`);
        const shfmtPath = extensionInfo_1.ConfigManager.getShfmtPath();
        const args = extensionInfo_1.ConfigManager.buildShfmtArgs();
        const checkArgs = [...args, '-d', document.fileName];
        const fullCommand = `${shfmtPath} ${checkArgs.join(' ')}`;
        (0, logger_1.log)(`Command: ${fullCommand}`);
        const shfmt = (0, child_process_1.spawn)(shfmtPath, checkArgs);
        const stdout = [];
        const stderr = [];
        shfmt.stdout.on('data', (chunk) => {
            stdout.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
        });
        shfmt.stderr.on('data', (chunk) => {
            stderr.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
        });
        shfmt.on('close', (code) => {
            (0, shell_1.logShellCommandCloseOutput)(fullCommand, stdout, stderr, code);
            const stdoutStr = Buffer.concat(stdout).toString();
            const stderrStr = Buffer.concat(stderr).toString();
            if (code !== 0 || stderrStr) {
                (0, logger_1.log)(`Found format issues for: ${fileName}`);
                const parsed = parseShfmtFormatError(document, stdoutStr);
                diagnostics.push(...parsed);
            }
            else {
                (0, logger_1.log)(`No format issues for: ${fileName}`);
            }
            resolve(diagnostics);
        });
        shfmt.on('error', (err) => {
            (0, shell_1.logShellCommandErrorOutput)(fullCommand, stdout, stderr, err);
            const errorMessage = (0, spawnErrorHandler_1.formatErrorLogMessage)('shfmt', err);
            (0, logger_1.log)(errorMessage);
            const errorDiagnostic = (0, spawnErrorHandler_1.createSpawnErrorDiagnostic)(document, 'shfmt', fullCommand, err);
            if (errorDiagnostic) {
                diagnostics.push(errorDiagnostic);
                (0, logger_1.log)(`Created diagnostic for shfmt error at line 0`);
            }
            resolve(diagnostics);
        });
    });
}
/**
 * 解析 shfmt 格式错误输出
 * @param document 文档对象
 * @param message shfmt 输出
 * @returns 诊断数组
 */
function parseShfmtFormatError(document, message) {
    const diagnostics = [];
    const lines = message.split('\n');
    for (const line of lines) {
        if (!line.trim())
            continue;
        // 跳过 diff 文件头
        if (line.startsWith('---') || line.startsWith('+++') || line.startsWith('@@')) {
            continue;
        }
        // 处理 diff 输出
        if (line.startsWith('-') || line.startsWith('+')) {
            const range = new vscode.Range(document.positionAt(0), document.positionAt(document.getText().length));
            const diagnostic = new vscode.Diagnostic(range, messages_1.FormatIssueMessage, vscode.DiagnosticSeverity.Warning);
            diagnostic.code = `${extensionInfo_1.PackageInfo.extensionName}-format-issue`;
            diagnostic.source = extensionInfo_1.PackageInfo.diagnosticSource;
            if (!diagnostics.some(d => d.code === diagnostic.code)) {
                diagnostics.push(diagnostic);
                (0, logger_1.log)(`Added format diagnostic`);
            }
        }
    }
    return diagnostics;
}
//# sourceMappingURL=shfmt.js.map