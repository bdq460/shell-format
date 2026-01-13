/**
 * Shellcheck 诊断模块
 * 使用 shellcheck 检测 Shell 脚本的语法和最佳实践问题
 */

import { spawn } from 'child_process';
import * as vscode from 'vscode';
import { PackageInfo } from '../utils/extensionInfo';
import { log } from '../utils/logger';
import { logShellCommandCloseOutput, logShellCommandErrorOutput } from '../utils/shell';
import {
    createSpawnErrorDiagnostic,
    formatErrorLogMessage
} from '../utils/spawnErrorHandler';

/**
 * 使用 shellcheck 进行语法和最佳实践检查
 * @param document 文档对象
 * @returns 诊断数组
 */
export async function checkWithShellcheck(document: vscode.TextDocument): Promise<vscode.Diagnostic[]> {
    const diagnostics: vscode.Diagnostic[] = [];

    return new Promise((resolve) => {
        log(`Checking with shellcheck for: ${document.fileName}`);

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
        log(`Execute command: ${fullCommand}`);
        const shellcheck = spawn(command, args);
        const stdout: Buffer[] = [];
        const stderr: Buffer[] = [];

        shellcheck.stdout.on('data', (chunk) => {
            stdout.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
        });

        shellcheck.stderr.on('data', (chunk) => {
            stderr.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
        });

        shellcheck.on('close', (code) => {

            logShellCommandCloseOutput(fullCommand, stdout, stderr, code);

            const allOutput = Buffer.concat([...stdout, ...stderr]).toString();
            if (code !== 0 && allOutput.length > 0) {
                log(`Shellcheck found issues for: ${document.fileName}`);
                const parsed = parseShellcheckOutput(document, allOutput);
                diagnostics.push(...parsed);
            } else {
                if (code === 0) {
                    log(`Shellcheck passed for: ${document.fileName}`);
                } else {
                    log(`Shellcheck failed for: ${document.fileName} (exit code: ${code})`);
                }
            }
            resolve(diagnostics);
        });

        shellcheck.on('error', (err: NodeJS.ErrnoException) => {

            logShellCommandErrorOutput(fullCommand, stdout, stderr, err);

            const errorMessage = formatErrorLogMessage('shellcheck', err);
            log(errorMessage);

            const errorDiagnostic = createSpawnErrorDiagnostic(
                document,
                PackageInfo.diagnosticSource,
                fullCommand,
                err
            );

            if (errorDiagnostic) {
                diagnostics.push(errorDiagnostic);
                log(`Created diagnostic for shellcheck error at line 0`);
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
function parseShellcheckOutput(document: vscode.TextDocument, output: string): vscode.Diagnostic[] {
    const diagnostics: vscode.Diagnostic[] = [];
    const lines = output.split('\n');

    for (const line of lines) {
        if (!line.trim()) continue;

        // 优先尝试 GCC 格式
        let errorMatch = line.match(/^(.+?):(\d+):(\d+): (error|warning|note): (.+) \[(SC\d+)\]$/);
        if (errorMatch) {
            const [, , lineNum, colNum, type, message, scCode] = errorMatch;
            const lineNumber = parseInt(lineNum, 10) - 1;
            const column = parseInt(colNum, 10) - 1;

            if (lineNumber >= 0 && lineNumber < document.lineCount) {
                // const lineRange = document.lineAt(lineNumber).range;
                const errorRange = new vscode.Range(lineNumber, column, lineNumber, column + 1);

                const diagnostic = new vscode.Diagnostic(
                    errorRange,
                    `${scCode}: ${message}`,
                    type === 'error' ? vscode.DiagnosticSeverity.Error :
                        type === 'warning' ? vscode.DiagnosticSeverity.Warning :
                            vscode.DiagnosticSeverity.Information
                );
                diagnostic.code = scCode;
                diagnostic.source = PackageInfo.diagnosticSource;
                diagnostics.push(diagnostic);
                log(`Added shellcheck diagnostic at line ${lineNumber + 1}: ${scCode} - ${message}`);
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
                const diagnostic = new vscode.Diagnostic(
                    lineRange,
                    line.trim(),
                    vscode.DiagnosticSeverity.Error
                );
                diagnostic.code = 'shellcheck-error';
                diagnostic.source = PackageInfo.diagnosticSource;
                diagnostics.push(diagnostic);
                log(`Added shellcheck diagnostic at line ${lineNumber + 1}`);
            }
        }
    }

    return diagnostics;
}
