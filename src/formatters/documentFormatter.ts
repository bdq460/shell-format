/**
 * 文档格式化器模块
 * 提供文档格式化功能
 */

import * as path from 'path';
import * as vscode from 'vscode';
import { ShfmtTool } from '../tools/shfmt';
import { DiagnosticAdapter, FormatterAdapter, LoggerAdapter } from '../adapters';
import { ConfigManager, PackageInfo } from '../utils/extensionInfo';
import { log } from '../utils/logger';
import { createSpawnErrorDiagnostic } from '../utils/spawnErrorHandler';

let diagnosticCollection: vscode.DiagnosticCollection;
const shfmtTool = new ShfmtTool();
const loggerAdapter = new LoggerAdapter();

/**
 * 初始化格式化器
 */
export function initializeFormatter(diagnosticCol: vscode.DiagnosticCollection): void {
    diagnosticCollection = diagnosticCol;
}

/**
 * 格式化文档
 * @param document 文档对象
 * @param _options 格式化选项（未使用，由 shfmt 内部处理）
 * @param token 取消令牌
 * @returns TextEdit 数组
 *
 * 使用 shfmt 格式化文档, 并返回格式化后的内容
 */
export async function formatDocument(
    document: vscode.TextDocument,
    _options?: vscode.FormattingOptions,
    _token?: vscode.CancellationToken
): Promise<vscode.TextEdit[]> {
    const fileName = path.basename(document.fileName);
    const content = document.getText();

    log(`Start format document: ${fileName}`);

    try {
        const formatOptions = {
            commandPath: ConfigManager.getShfmtPath(),
            indent: getIndentSize(),
            binaryNextLine: true,
            caseIndent: true,
            spaceRedirects: true,
            logger: loggerAdapter
        };

        const result = await shfmtTool.format(content, formatOptions);

        // 格式化失败，创建诊断
        if (!result.success && result.syntaxErrors) {
            log(`Format failed with syntax errors`);

            const diagnostics = DiagnosticAdapter.convert(
                result,
                document,
                PackageInfo.diagnosticSource
            );

            // 获取已有诊断并合并
            const existingDiagnostics = diagnosticCollection.get(document.uri) || [];
            const allDiagnostics = [...existingDiagnostics, ...diagnostics];
            diagnosticCollection.set(document.uri, allDiagnostics);

            return [];
        }

        // 格式化成功，清除诊断并返回 TextEdit
        diagnosticCollection.delete(document.uri);
        return FormatterAdapter.convert(result, document);

    } catch (error) {
        // 处理执行错误（如进程启动失败）
        if (error instanceof Error) {
            const shfmtPath = ConfigManager.getShfmtPath();
            const args = ConfigManager.buildShfmtArgs();
            const fullCommand = `${shfmtPath} ${args.join(' ')} ${fileName}`;

            log(`Format error: ${error.message}`);

            const errorDiagnostic = createSpawnErrorDiagnostic(
                document,
                PackageInfo.diagnosticSource,
                fullCommand,
                error as NodeJS.ErrnoException
            );

            if (errorDiagnostic) {
                diagnosticCollection.set(document.uri, [errorDiagnostic]);
            }
        }

        return [];
    }
}

/**
 * 获取缩进大小
 */
function getIndentSize(): number | undefined {
    const tabSetting = ConfigManager.getTabSize();

    if (tabSetting === 'ignore') {
        return undefined;
    } else if (typeof tabSetting === 'number' && tabSetting >= 0) {
        return tabSetting;
    }

    // 使用 VSCode 缩进配置
    if (tabSetting !== 'vscode') {
        log(`Invalid tabSize setting: ${tabSetting}, using vscode tabSize instead`);
    }
    const vscodeTabSize = vscode.workspace.getConfiguration('editor').get<string>('tabSize');
    return vscodeTabSize ? parseInt(vscodeTabSize, 10) : undefined;
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
