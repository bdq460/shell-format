/**
 * Shfmt 格式检查模块
 * 使用 shfmt 检测格式问题
 */

import { spawn } from 'child_process';
import * as path from 'path';
import * as vscode from 'vscode';
import { ConfigManager, PackageInfo } from '../utils/extensionInfo';
import { log } from '../utils/logger';
import { FormatIssueMessage } from '../utils/messages';
import { logShellCommandCloseOutput, logShellCommandErrorOutput } from '../utils/shell';
import {
    createSpawnErrorDiagnostic,
    formatErrorLogMessage
} from '../utils/spawnErrorHandler';

/**
 * 使用 shfmt 进行格式检查
 * @param document 文档对象
 * @returns 诊断数组
 */
export async function checkFormat(document: vscode.TextDocument): Promise<vscode.Diagnostic[]> {
    const fileName = path.basename(document.fileName);
    const diagnostics: vscode.Diagnostic[] = [];

    return new Promise((resolve) => {
        log(`Checking format for: ${fileName}`);

        const shfmtPath = ConfigManager.getShfmtPath();
        const args = ConfigManager.buildShfmtArgs();
        const checkArgs = [...args, '-d', document.fileName];
        const fullCommand = `${shfmtPath} ${checkArgs.join(' ')}`;
        log(`Command: ${fullCommand}`);

        const shfmt = spawn(shfmtPath, checkArgs);
        const stdout: Buffer[] = [];
        const stderr: Buffer[] = [];

        shfmt.stdout.on('data', (chunk) => {
            stdout.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
        });

        shfmt.stderr.on('data', (chunk) => {
            stderr.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
        });

        shfmt.on('close', (code) => {

            logShellCommandCloseOutput(fullCommand, stdout, stderr, code);

            const stdoutStr = Buffer.concat(stdout).toString();
            const stderrStr = Buffer.concat(stderr).toString();
            if (code !== 0 || stderrStr) {
                log(`Found format issues for: ${fileName}`);
                const parsed = parseShfmtFormatError(document, stdoutStr);
                diagnostics.push(...parsed);
            } else {
                log(`No format issues for: ${fileName}`);
            }
            resolve(diagnostics);
        });

        shfmt.on('error', (err: NodeJS.ErrnoException) => {

            logShellCommandErrorOutput(fullCommand, stdout, stderr, err);

            const errorMessage = formatErrorLogMessage('shfmt', err);
            log(errorMessage);

            const errorDiagnostic = createSpawnErrorDiagnostic(
                document,
                'shfmt',
                fullCommand,
                err
            );

            if (errorDiagnostic) {
                diagnostics.push(errorDiagnostic);
                log(`Created diagnostic for shfmt error at line 0`);
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
function parseShfmtFormatError(document: vscode.TextDocument, message: string): vscode.Diagnostic[] {
    const diagnostics: vscode.Diagnostic[] = [];
    const lines = message.split('\n');

    for (const line of lines) {
        if (!line.trim()) continue;

        // 跳过 diff 文件头
        if (line.startsWith('---') || line.startsWith('+++') || line.startsWith('@@')) {
            continue;
        }

        // 处理 diff 输出
        if (line.startsWith('-') || line.startsWith('+')) {
            const range = new vscode.Range(
                document.positionAt(0),
                document.positionAt(document.getText().length)
            );

            const diagnostic = new vscode.Diagnostic(
                range,
                FormatIssueMessage,
                vscode.DiagnosticSeverity.Warning
            );

            diagnostic.code = `${PackageInfo.extensionName}-format-issue`;
            diagnostic.source = PackageInfo.diagnosticSource;

            if (!diagnostics.some(d => d.code === diagnostic.code)) {
                diagnostics.push(diagnostic);
                log(`Added format diagnostic`);
            }
        }
    }

    return diagnostics;
}
