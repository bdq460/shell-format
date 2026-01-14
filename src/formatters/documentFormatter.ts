/**
 * 文档格式化器模块
 * 提供文档格式化功能
 */

import { spawn } from 'child_process';
import * as path from 'path';
import * as vscode from 'vscode';
import { ConfigManager, PackageInfo } from '../utils/extensionInfo';
import { log } from '../utils/logger';
import { logShellCommandCloseOutput, logShellCommandErrorOutput } from '../utils/shell';
import {
    createSpawnErrorDiagnostic,
    formatErrorLogMessage
} from '../utils/spawnErrorHandler';

let diagnosticCollection: vscode.DiagnosticCollection;

/**
 * 初始化格式化器
 */
export function initializeFormatter(diagnosticCol: vscode.DiagnosticCollection): void {
    diagnosticCollection = diagnosticCol;
}

/**
 * 格式化文档
 * @param document 文档对象
 * @param options 格式化选项
 * @param token 取消令牌
 * @returns TextEdit 数组
 *
 * 使用shfmt格式化文档, 并返回格式化后的内容, 即使内容没有变化, 也会返回。
 * 因此即使文档没有格式调整, 也会返回一个非空的TextEdit数组, 但是这会导致文件修改时间发生变化.
 */
export async function formatDocument(
    document: vscode.TextDocument,
    options?: vscode.FormattingOptions,
    token?: vscode.CancellationToken
): Promise<vscode.TextEdit[]> {
    const fileName = path.basename(document.fileName);
    log(`Start format document: ${fileName}`);

    const shfmtPath = ConfigManager.getShfmtPath();
    const args = ConfigManager.buildShfmtArgs();
    const content = document.getText();
    const fullCommand = `${shfmtPath} ${args.join(' ')} ${fileName}`;
    log(`Execute command: ${fullCommand}`);

    return new Promise((resolve, reject) => {
        if (token?.isCancellationRequested) {
            log(`Formatting cancelled for: ${fileName}`);
            reject(new vscode.CancellationError());
            return;
        }

        const shfmt = spawn(shfmtPath, args);
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

            // 一般情况下shfmt -i 2 -bn -ci -sr执行格式化操作后, 无论是否有格式调整, 都会返回0的退出码
            // 通过stdout判断是否有格式修改
            // 1. 如果有格式调整, 则stdout不为空, 返回格式化后的内容
            // 2. 如果没有格式调整, 则stdout为空, 返回原内容
            //
            // 在一些情况下使用shfmt进行文件格式化操作的时候
            // 如果脚本代码存在语法错误，shfmt会返回非0的退出码，同时输出错误信息到stderr
            //
            // 如对于以下代码, 其if条件没有闭合:
            //  ```shell
            //      if [ "x" = "x" ]
            //         echo "missing then"
            //  ```
            //
            // 执行命令:
            // ```shell
            //  shfmt -i 2 -bn -ci -sr test_syntax.sh.git
            // ```
            //
            // shfmt会返回非0的退出码，同时输出错误信息到stderr。
            // 输出如下:
            // ```text
            //  returnCode: 1
            //  Stdout:
            //  Stderr: <standard input >: 16: 9: reached EOF without matching { with }
            // ```
            //
            // 对于这时发现的错误, 按道理应该也在diagnostic中显示, 要求用户修复
            // 但是由于shellcheck也会进行语法检查, 其检查结果会覆盖shfmt格式化时发现的语法错误
            // 当文件内容变化时就会触发文件合规检测, 其中就包括了shellcheck的检查.
            // 因此不会存丢失shfmt进行format操作时发现的问题.
            // 所以这里只对shfmt成功执行格式化的情况进行处理, 对返回code非0的情况不做处理,仅做记录处理.

            const stdoutStr = Buffer.concat(stdout).toString();
            const stderrStr = Buffer.concat(stderr).toString();

            if (code === 0) {
                // 检查是否有 stderr 输出（部分格式化错误）
                if (stderrStr.length > 0) {
                    log(`Format completed with warnings: ${stderrStr}`);
                    // 创建诊断显示错误信息
                    const diagnostic = new vscode.Diagnostic(
                        new vscode.Range(0, 0, 0, 0),
                        stderrStr,
                        vscode.DiagnosticSeverity.Warning
                    );
                    diagnostic.source = PackageInfo.diagnosticSource;
                    diagnosticCollection.set(document.uri, [diagnostic]);
                    resolve([]);
                    return;
                }

                log(`File well formatted. file:${fileName}`);

                // 比较格式化前后的内容，只有内容变化时才返回 TextEdit
                if (stdoutStr === content) {
                    log('Content unchanged, no edits needed');
                    resolve([]);
                    return;
                }

                const fullRange = new vscode.Range(
                    document.positionAt(0),
                    document.positionAt(document.getText().length)
                );

                diagnosticCollection.delete(document.uri);
                // 返回替换整个文档的 TextEdit
                // vscode会使用 TextEdit 替换整个文档
                resolve([vscode.TextEdit.replace(fullRange, stdoutStr)]);
            } else {
                log(`Found format errors. file:${fileName}, stderrStr: ${stderrStr}`);
                log('Returning empty edits due to format errors');
                resolve([]);
            }
        });

        shfmt.on('error', (err: NodeJS.ErrnoException) => {

            logShellCommandErrorOutput(fullCommand, stdout, stderr, err);

            const errorMessage = formatErrorLogMessage('shfmt', err);
            log(`${errorMessage}\nCommand: ${fullCommand}`);

            const errorDiagnostic = createSpawnErrorDiagnostic(
                document,
                PackageInfo.diagnosticSource,
                fullCommand,
                err
            );

            if (errorDiagnostic) {
                diagnosticCollection.set(document.uri, [errorDiagnostic]);
                log(`Created diagnostic for shfmt formatting error at line 0`);
            }

            reject(err);
        });

        shfmt.stdin.write(content);
        shfmt.stdin.end();

        token?.onCancellationRequested(() => {
            log(`Killing shfmt process for: ${fileName}`);
            shfmt.kill();
        });
    });
}

/**
 * 格式化文档范围
 * 注意：Shell 脚本的格式化需要完整的上下文（if/fi、do/done 等配对），
 * 因此即使只选中部分文本，也需要对整个文档进行格式化。
 * VSCode 会自动裁剪 TextEdit，只应用选区内的变更。
 *
 * @param document 文档对象
 * @param range 选中的范围（未使用，因为需要完整上下文）
 * @param options 格式化选项
 * @param token 取消令牌
 * @returns TextEdit 数组
 */
export async function formatDocumentRange(
    document: vscode.TextDocument,
    range: vscode.Range,
    options?: vscode.FormattingOptions,
    token?: vscode.CancellationToken
): Promise<vscode.TextEdit[]> {
    log(`Start format document range for: ${document.fileName}, range: [${range.start.line}, ${range.start.character}] - [${range.end.line}, ${range.end.character}]`);
    // 直接调用 formatDocument，由 VSCode 自动裁剪选区内的变更
    log('Note: Shell script formatting requires full document context, will format entire document');
    return formatDocument(document, options, token);
}
