import { spawn } from 'child_process';
import * as path from 'path';
import * as vscode from 'vscode';

// extension name
const extensionName = 'shell-format';
const diagnosticSource = extensionName;
// 全局诊断集合
let diagnosticCollection: vscode.DiagnosticCollection;
// 输出通道
let outputChannel: vscode.OutputChannel;
// 辅助函数：console.log 包装器
function log(message: string): void {
    // 为消息增加插件名称
    message = `[${extensionName}] ${message}`;
    // 为消息增加时间戳
    const timestamp = new Date().toLocaleTimeString('zh-CN', { hour12: false });
    message = `[${timestamp}] ${message}`;
    // 输出到控制台
    console.log(message);
    // 输出到输出通道
    if (outputChannel) {
        outputChannel.appendLine(message);
    }
}

export function activate(context: vscode.ExtensionContext) {

    log('Extension is now active');

    // 创建日志输出通道
    console.log(`Create output channel`);
    outputChannel = vscode.window.createOutputChannel(`${extensionName}`);

    // 创建诊断集合
    log('Diagnostic collection created');
    diagnosticCollection = vscode.languages.createDiagnosticCollection(`${extensionName}`);

    // 注册文档格式化提供程序
    const formatProvider = vscode.languages.registerDocumentFormattingEditProvider(
        'shellscript',
        {
            provideDocumentFormattingEdits(
                document: vscode.TextDocument,
                options: vscode.FormattingOptions,
                token: vscode.CancellationToken
            ): vscode.ProviderResult<vscode.TextEdit[]> {
                return formatDocument(document, options, token);
            }
        }
    );

    // 注册 Code Actions 提供程序
    const codeActionProvider = vscode.languages.registerCodeActionsProvider(
        'shellscript',
        new ShellFormatCodeActionProvider(),
        {
            providedCodeActionKinds: [
                vscode.CodeActionKind.QuickFix,
                vscode.CodeActionKind.SourceFixAll
            ]
        }
    );

    // 注册命令
    const formatCommand = vscode.commands.registerCommand(
        'shellformat.formatDocument',
        async () => {
            const editor = vscode.window.activeTextEditor;
            if (editor) {
                await formatDocument(editor.document);
            }
        }
    );

    const fixAllCommand = vscode.commands.registerCommand(
        'shellformat.fixAllProblems',
        async (uri?: vscode.Uri) => {
            let document: vscode.TextDocument | undefined;

            if (uri) {
                // 从问题面板的修复命令调用
                document = vscode.workspace.textDocuments.find(
                    doc => doc.uri.toString() === uri.toString()
                );
            } else if (vscode.window.activeTextEditor) {
                // 从命令面板调用
                document = vscode.window.activeTextEditor.document;
            }

            if (document) {
                const edits = await formatDocument(document);
                if (edits && edits.length > 0) {
                    // 手动应用编辑到文档
                    const edit = new vscode.WorkspaceEdit();
                    for (const textEdit of edits) {
                        edit.replace(document.uri, textEdit.range, textEdit.newText);
                    }
                    await vscode.workspace.applyEdit(edit);
                    vscode.window.showInformationMessage(
                        'Shell script formatted successfully'
                    );
                } else if (edits && edits.length === 0) {
                    vscode.window.showWarningMessage(
                        'Shell script has formatting issues. Please check the Problems panel.'
                    );
                }
            }
        }
    );

    // 监听文档保存时进行诊断
    const saveListener = vscode.workspace.onDidSaveTextDocument(
        async (document) => {
            if (document.languageId === 'shellscript') {
                await diagnoseDocument(document);
            }
        }
    );

    // 监听文档打开时进行诊断
    const openListener = vscode.workspace.onDidOpenTextDocument(
        async (document) => {
            if (document.languageId === 'shellscript') {
                await diagnoseDocument(document);
            }
        }
    );

    // 监听文档内容变化时进行诊断（防抖）
    const changeListener = vscode.workspace.onDidChangeTextDocument(
        async (event) => {
            if (event.document.languageId === 'shellscript') {
                debounceDiagnose(event.document);
            }
        }
    );

    // 监听配置变化
    const configChangeListener =
        vscode.workspace.onDidChangeConfiguration(async (event) => {
            if (event.affectsConfiguration('shellformat')) {
                log('Configuration changed, re-diagnosing...');
                diagnoseAllShellScripts();
            }
        });

    // 诊断所有打开的 shell 脚本
    diagnoseAllShellScripts();

    // 退出时清理
    context.subscriptions.push(
        formatProvider,
        codeActionProvider,
        formatCommand,
        fixAllCommand,
        saveListener,
        openListener,
        changeListener,
        configChangeListener,
        diagnosticCollection,
        outputChannel
    );
}

// 防抖定时器
let debounceTimer: NodeJS.Timeout | undefined;
function debounceDiagnose(document: vscode.TextDocument, delay: number = 500) {
    if (debounceTimer) {
        clearTimeout(debounceTimer);
    }
    debounceTimer = setTimeout(() => {
        diagnoseDocument(document);
    }, delay);
}

class ShellFormatCodeActionProvider
    implements vscode.CodeActionProvider {
    public provideCodeActions(
        document: vscode.TextDocument,
        range: vscode.Range | vscode.Selection,
        context: vscode.CodeActionContext,
        token: vscode.CancellationToken
    ): vscode.ProviderResult<(vscode.CodeAction | vscode.Command)[]> {
        const actions: vscode.CodeAction[] = [];

        // 为每个诊断创建快速修复
        if (context.diagnostics) {
            for (const diagnostic of context.diagnostics) {
                if (diagnostic.source === diagnosticSource) {
                    const fixThisAction = new vscode.CodeAction(
                        'Fix this issue with shfmt',
                        vscode.CodeActionKind.QuickFix
                    );
                    fixThisAction.diagnostics = [diagnostic];
                    fixThisAction.isPreferred = true;
                    fixThisAction.command = {
                        title: 'Fix this issue with shfmt',
                        command: 'shellformat.fixAllProblems',
                        arguments: [document.uri]
                    };
                    actions.push(fixThisAction);
                }
            }
        }

        // 修复所有问题的快速修复
        const fixAllAction = new vscode.CodeAction(
            'Fix all with shfmt',
            vscode.CodeActionKind.SourceFixAll
        );
        fixAllAction.command = {
            title: 'Fix all with shfmt',
            command: 'shellformat.fixAllProblems',
            arguments: [document.uri]
        };
        actions.push(fixAllAction);

        return actions;
    }
}

async function formatDocument(
    document: vscode.TextDocument,
    options?: vscode.FormattingOptions,
    token?: vscode.CancellationToken
): Promise<vscode.TextEdit[]> {
    const filePath = document.fileName;
    const fileName = path.basename(filePath);
    log(`Starting format for: ${fileName}`);

    const config = vscode.workspace.getConfiguration('shellformat');
    const shfmtPath = getShfmtPath(config);
    const args = buildShfmtArgs(document, config);

    const content = document.getText();
    log(`Command: ${shfmtPath} ${args.join(' ')} ${fileName}`);

    return new Promise((resolve, reject) => {
        if (token?.isCancellationRequested) {
            log(`Formatting cancelled for: ${fileName}`);
            reject(new vscode.CancellationError());
            return;
        }

        // 使用 spawn 调用 shfmt
        const shfmt = spawn(shfmtPath, args);

        let stdout: Buffer[] = [];
        let stderr: Buffer[] = [];

        shfmt.stdout.on('data', (chunk) => {
            stdout.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
        });

        shfmt.stderr.on('data', (chunk) => {
            stderr.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
        });

        shfmt.on('close', (code) => {
            const stdoutStr = Buffer.concat(stdout).toString();
            const stderrStr = Buffer.concat(stderr).toString();
            log(`Format complete - code: ${code}\nStdout: ${stdoutStr}\nStderr: ${stderrStr}`);

            if (code === 0) {
                log(`File well format. file:${fileName}`);
                // 格式化成功
                const fullRange = new vscode.Range(
                    document.positionAt(0),
                    document.positionAt(document.getText().length)
                );

                // 清除诊断信息
                diagnosticCollection.delete(document.uri);
                // 返回修改操作
                resolve([vscode.TextEdit.replace(fullRange, stdoutStr)]);
            } else {
                log(`Found format errors. file:${fileName}, stdoutStr: ${stdoutStr}`);
                // 格式化失败，不需要在此创建诊断，因为 diagnoseDocument 会自动处理
                // 返回空数组而不是reject
                log('Returning empty edits due to format errors')
                // 返回空数组, 表示格式化失败, 不修改原文件内容
                resolve([]);
            }
        });

        shfmt.on('error', (err) => {
            log(`Command: ${shfmtPath} ${args.join(' ')} ${fileName} execute failed! ${err.message}`);
            log(`Rejecting promise...`)
            reject(err);
        });

        // 写入内容到 stdin
        shfmt.stdin.write(content);
        shfmt.stdin.end();

        // 取消时终止进程
        token?.onCancellationRequested(() => {
            log(`Killing shfmt process for: ${fileName}`);
            shfmt.kill();
        });
    });
}

function buildShfmtArgs(
    document: vscode.TextDocument,
    config: vscode.WorkspaceConfiguration
): string[] {
    const defaultArgs = [
        '-i', // 设置缩进空格数（默认：0)
        '2', // 缩进级别
        '-bn',  // 二元运算符后换行
        '-ci', // 在 case 模式中对齐替代语句
        '-sr', // 重定向操作符后换行
        // '-d' // 以 diff 格式显示格式差异, 即查看文件是否有不符合预期的格式
    ];

    log(`Building args for: ${document.fileName}`);
    const args: string[] = [];

    // 获取用户自定义参数（字符串格式）
    const userFlag = config.get<string>('flag');
    const userArgs = config.get<string[]>('args');
    if (userFlag) {
        console.log(`User set flags: ${userFlag}`);
        // 解析用户提供的标志
        const flagParts = userFlag.split(' ').filter(s => s.trim());
        // 过滤掉 -w 标志（与格式化提供者冲突）
        const validFlags = flagParts.filter(f => !f.includes('-w'));
        args.push(...validFlags);
    } else if (userArgs && userArgs.length > 0) {
        console.log(`User set args ${userArgs}`);
        args.push(...userArgs);
    } else {
        log(`User not set flags and args!, use default args ${defaultArgs}`);
        args.push(...defaultArgs);
    }

    // 如果不包含 -d 参数，将-d添加到参数列表中
    // if (!args.includes('-d')) {
    //     log(`Args not include -d, adding -d to ensure formatting`);
    //     args.push('-d');
    // }

    return args;
}

function getShfmtPath(config: vscode.WorkspaceConfiguration): string {
    const configuredPath = config.get<string>('path');

    if (configuredPath) {
        return configuredPath;
    }

    // 默认使用 shfmt
    return 'shfmt';
}

/**
 * 对给定文档进行诊断，检查 Shell 脚本格式问题和语法错误
 * 使用 shellcheck 检查语义和最佳实践，使用 shfmt 检测格式问题
 *
 * @param document 需要诊断的 VSCode 文档对象
 * @returns Promise<void> 返回一个 Promise，当诊断完成时解析
 */
async function diagnoseDocument(document: vscode.TextDocument): Promise<void> {
    const fileName = path.basename(document.fileName);
    log(`Starting diagnosis for: ${fileName}`);

    // 获取配置信息和错误处理方式
    const config = vscode.workspace.getConfiguration('shellformat');
    const onError = config.get<string>('onError', 'showProblem');
    log(`onError setting: ${onError}`);

    // 如果错误处理方式不是显示问题，则清除之前的诊断信息并返回
    if (onError !== 'showProblem') {
        log(`Skipping diagnosis (onError=${onError})`);
        diagnosticCollection.delete(document.uri);
        return;
    }

    // 清空之前的诊断信息
    diagnosticCollection.delete(document.uri);
    const allDiagnostics: vscode.Diagnostic[] = [];

    // 步骤1: 使用 shellcheck 进行语法和最佳实践检查（优先级最高）
    const shellcheckErrors = await checkWithShellcheck(document);
    allDiagnostics.push(...shellcheckErrors);

    // 步骤2: 使用 shfmt 进行格式检查
    const formatErrors = await checkFormat(document, config);
    allDiagnostics.push(...formatErrors);

    // 应用所有诊断信息
    if (allDiagnostics.length > 0) {
        diagnosticCollection.set(document.uri, allDiagnostics);
        log(`Diagnostics created. found ${allDiagnostics.length} issues.`);
    } else {
        log(`No issues found for: ${fileName}`);
    }
}

/**
 * 使用 shellcheck 进行语法和最佳实践检查
 */
async function checkWithShellcheck(document: vscode.TextDocument): Promise<vscode.Diagnostic[]> {
    const fileName = path.basename(document.fileName);
    const diagnostics: vscode.Diagnostic[] = [];

    return new Promise((resolve) => {
        log(`Checking with shellcheck for: ${fileName}`);

        // 尝试使用 shellcheck，如果不存在则跳过
        const shellcheck = spawn('shellcheck', ['-f', 'gcc', document.fileName]);
        let stdout: Buffer[] = [];
        let stderr: Buffer[] = [];

        shellcheck.stdout.on('data', (chunk) => {
            stdout.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
        });

        shellcheck.stderr.on('data', (chunk) => {
            stderr.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
        });

        shellcheck.on('close', (code) => {
            // 合并 stdout 和 stderr，因为 shellcheck 可能输出到任一流
            const allOutput = Buffer.concat([...stdout, ...stderr]).toString();
            if (code !== 0 && allOutput.length > 0) {
                log(`Shellcheck found issues for ${fileName}`);

                // 解析 shellcheck 输出
                const parsed = parseShellcheckOutput(document, allOutput);
                diagnostics.push(...parsed);
            } else {
                if (code === 0) {
                    log(`Shellcheck passed for: ${fileName}`);
                } else {
                    log(`Shellcheck not available or failed for: ${fileName}`);
                }
            }
            resolve(diagnostics);
        });

        shellcheck.on('error', (err) => {
            log(`Shellcheck error for ${fileName}: ${err.message} (shellcheck may not be installed)`);
            resolve(diagnostics);
        });
    });
}

/**
 * 解析 shellcheck 输出（支持多种格式）
 * GCC 格式: file:line:column: error type: message [SCCODE]
 * 默认格式: In file line X: ... SCXXXX (error): ...
 */
function parseShellcheckOutput(document: vscode.TextDocument, output: string): vscode.Diagnostic[] {
    const diagnostics: vscode.Diagnostic[] = [];
    const lines = output.split('\n');

    for (const line of lines) {
        if (!line.trim()) continue;

        // 优先尝试 GCC 格式: file:line:column: error type: message [SCCODE]
        let errorMatch = line.match(/^(.+?):(\d+):(\d+): (error|warning|note): (.+) \[(SC\d+)\]$/);
        if (errorMatch) {
            const [, file, lineNum, colNum, type, message, scCode] = errorMatch;
            const lineNumber = parseInt(lineNum, 10) - 1;
            const colNumber = parseInt(colNum, 10) - 1;

            if (lineNumber >= 0 && lineNumber < document.lineCount) {
                const lineRange = document.lineAt(lineNumber).range;
                const diagnostic = new vscode.Diagnostic(
                    lineRange,
                    `${scCode}: ${message}`,
                    type === 'error' ? vscode.DiagnosticSeverity.Error :
                    type === 'warning' ? vscode.DiagnosticSeverity.Warning :
                    vscode.DiagnosticSeverity.Information
                );
                diagnostic.code = scCode;
                diagnostic.source = 'shellcheck';
                diagnostics.push(diagnostic);
                log(`Added shellcheck diagnostic at line ${lineNumber + 1}: ${scCode} - ${message}`);
            }
            continue;
        }

        // 尝试默认格式: In file line X: ... SCXXXX (error): ...
        errorMatch = line.match(/In (.+?) line (\d+):\s+.*?\n.*?SC(\d+) \((error|warning|note)\): (.+?)$/s);
        if (!errorMatch) {
            errorMatch = line.match(/In (.+?) line (\d+):/);
            if (errorMatch) {
                const [, file, lineNum] = errorMatch;
                const lineNumber = parseInt(lineNum, 10) - 1;

                if (lineNumber >= 0 && lineNumber < document.lineCount) {
                    const lineRange = document.lineAt(lineNumber).range;
                    const diagnostic = new vscode.Diagnostic(
                        lineRange,
                        line.trim(),
                        vscode.DiagnosticSeverity.Error
                    );
                    diagnostic.code = 'shellcheck-error';
                    diagnostic.source = 'shellcheck';
                    diagnostics.push(diagnostic);
                    log(`Added shellcheck diagnostic at line ${lineNumber + 1}`);
                }
            }
        }
    }

    return diagnostics;
}

/**
 * 使用 shfmt 进行格式检查
 */
async function checkFormat(document: vscode.TextDocument, config: vscode.WorkspaceConfiguration): Promise<vscode.Diagnostic[]> {
    const fileName = path.basename(document.fileName);
    const diagnostics: vscode.Diagnostic[] = [];

    return new Promise((resolve) => {
        log(`Checking format for: ${fileName}`);

        const shfmtPath = getShfmtPath(config);
        const args = buildShfmtArgs(document, config);
        const checkArgs = [...args, '-d', document.fileName];
        log(`Command: ${shfmtPath} ${checkArgs.join(' ')}`);

        const shfmt = spawn(shfmtPath, checkArgs);
        let stdout: Buffer[] = [];
        let stderr: Buffer[] = [];

        shfmt.stdout.on('data', (chunk) => {
            stdout.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
        });

        shfmt.stderr.on('data', (chunk) => {
            stderr.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
        });

        shfmt.on('close', (code) => {
            const stdoutStr = Buffer.concat(stdout).toString();
            const stderrStr = Buffer.concat(stderr).toString();
            log(`Format check complete - exit code: ${code}\nStdout: ${stdoutStr}\nStderr: ${stderrStr}`);

            if (code !== 0 || stderrStr) {
                log(`Found format issues for: ${fileName}`);
                const parsed = parseShfmtFormatError(document, stdoutStr);
                diagnostics.push(...parsed);
            } else {
                log(`No format issues for: ${fileName}`);
            }
            resolve(diagnostics);
        });

        shfmt.on('error', (err) => {
            log(`Format check error for ${fileName}: ${err.message}`);
            resolve(diagnostics);
        });
    });
}

/**
 * 解析 shfmt 格式错误输出
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
                'Shell script has formatting issues. Run "Fix all with shfmt" to fix.',
                vscode.DiagnosticSeverity.Warning
            );

            diagnostic.code = `${extensionName}-format-issue`;
            diagnostic.source = diagnosticSource;

            // 避免重复添加
            if (!diagnostics.some(d => d.code === diagnostic.code)) {
                diagnostics.push(diagnostic);
                log(`Added format diagnostic`);
            }
        }
    }

    return diagnostics;
}

/**
 * 解析shfmt工具输出的错误信息并将其转换为VSCode诊断对象数组
 * @param document - 当前打开的文本文档对象
 * @param message - shfmt命令的标准输出内容
 * @returns 包含诊断信息的数组，用于在编辑器中标记错误或警告
 */
function parseDiagnostics(
    document: vscode.TextDocument,
    message: string
): vscode.Diagnostic[] {

    log(`Parsing diagnostics for: ${document.fileName}, message: ${message}`);
    const diagnostics: vscode.Diagnostic[] = [];
    const lines = message.split('\n');

    for (const line of lines) {
        log(`Parsing line: ${line}`);
        if (!line.trim()) {
            continue;
        }

        // 尝试解析 shfmt 错误格式: file:line:column: message
        const errorMatch = line.match(/^(.+?):(\d+):(\d+)?:?(.+)$/);
        if (errorMatch) {
            log(`ErrorMatch and parsing error: ${line}`);
            const [, file, lineNum, colNum, message] = errorMatch;
            log(`Parsed error message. file:${file}, line:${lineNum}, col:${colNum}, message:${message}`);
            const lineNumber = parseInt(lineNum, 10) - 1;
            const colNumber = parseInt(colNum, 10) - 1;
            if (lineNumber >= 0 && lineNumber < document.lineCount) {
                const lineRange = document.lineAt(lineNumber).range;
                log(`Line range: line: ${lineRange.start.line}, character: ${lineRange.start.character}`);
                const lineStartPosition = lineRange.start;
                log(`Line start position: line: ${lineStartPosition.line}, character: ${lineStartPosition.character}`);
                log(`Line start position: line: ${lineStartPosition.line}, character: ${lineStartPosition.character}`);
                const errorRangeStartPosition = lineStartPosition;
                log(`Error range start position: line: ${errorRangeStartPosition.line}, character: ${errorRangeStartPosition.character}`);
                const errorRangeEndPosition = errorRangeStartPosition.with(undefined, colNumber);
                log(`Error range end position: line: ${errorRangeEndPosition.line}, character: ${errorRangeEndPosition.character}`);
                const errorRange = new vscode.Range(errorRangeStartPosition, errorRangeEndPosition);
                log(`Error range: ${errorRange.start.line}, ${errorRange.start.character} - ${errorRange.end.line}, ${errorRange.end.character}`);
                const diagnosticMessage = `shfmt: ${message.trim()}`;
                const diagnostic = new vscode.Diagnostic(
                    errorRange,
                    diagnosticMessage,
                    vscode.DiagnosticSeverity.Error
                );
                diagnostic.code = 'shell-syntax-error';
                diagnostic.source = diagnosticSource;
                diagnostics.push(diagnostic);
                log(`Add diagnostic. errorRange:${diagnostic.range}, message:${diagnostic.message}, code:${diagnostic.code}, source:${diagnostic.source}`)

            }
            continue;
        }

        // 检查是否为diff输出格式，跳过文件头信息
        if (line.startsWith('---') || line.startsWith('+++') || line.startsWith('@@')) {
            log(`Skipping diff header: ${line}`);
            continue;
        }

        // 处理diff输出中的行变化（添加或删除的行）
        if (line.startsWith('-') || line.startsWith('+')) {
            log(`Processing diff line: ${line}`);
            // 格式差异
            const range = new vscode.Range(
                document.positionAt(0),
                document.positionAt(document.getText().length)
            );

            const diagnosticMessage = 'Shell script has formatting issues. Run "Fix all with shfmt" to fix.'

            const diagnostic = new vscode.Diagnostic(
                range,
                diagnosticMessage,
                vscode.DiagnosticSeverity.Warning
            );

            diagnostic.code = `${extensionName}-issue`;
            diagnostic.source = diagnosticSource;

            // 避免重复添加
            if (!diagnostics.some(d => d.code === diagnostic.code)) {
                diagnostics.push(diagnostic);
                log(`Add diagnostic. errorRange:${diagnostic.range}, message:${diagnostic.message}, code:${diagnostic.code}, source:${diagnostic.source}`)
            } else {
                log(`Diagnostic exists and no need to add! errorRange:${diagnostic.range}, message:${diagnostic.message}, code:${diagnostic.code}, source:${diagnostic.source}`)
            }
        }
    }

    return diagnostics;
}



/**
 * 诊断工作区中所有的 Shell 脚本文件
 * 遍历工作区中打开的所有文本文档，对其中的语言标识为 'shellscript' 的文档执行诊断
 * @returns 无返回值
 */
function diagnoseAllShellScripts(): void {
    // 遍历所有打开的文本文档
    vscode.workspace.textDocuments.forEach((document) => {
        if (document.languageId === 'shellscript') {
            diagnoseDocument(document);
        }
    });
}

/**
 * 停用扩展时的清理函数
 * 释放所有分配的资源，包括诊断集合、输出通道和防抖计时器
 */
export function deactivate() {
    log('Extension is now deactivated');
    if (diagnosticCollection) {
        diagnosticCollection.dispose();
        log('Diagnostic collection disposed');
    }
    if (outputChannel) {
        outputChannel.dispose();
        log('Output channel disposed');
    }
    if (debounceTimer) {
        clearTimeout(debounceTimer);
        log('Debounce timer cleared');
    }
}
