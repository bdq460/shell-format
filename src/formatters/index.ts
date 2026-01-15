/**
 * 文档格式化器模块
 * 提供文档格式化功能
 */

import * as vscode from 'vscode';
import { DiagnosticAdapter, FormatterAdapter } from '../adapters';
import { PackageInfo } from '../config';
import { getShfmtService } from '../services';
import { ToolExecutionError } from '../tools/errors';
import { logger } from '../utils/log';

let diagnosticCollection: vscode.DiagnosticCollection;

/**
 * 初始化格式化器
 * @param diagnosticCol VSCode 诊断集合
 */
export function initializeFormatter(diagnosticCol: vscode.DiagnosticCollection): void {
    diagnosticCollection = diagnosticCol;
}

// ==================== 格式化执行层 ====================

/**
 * 执行格式化
 * @param document 文档对象
 * @param token 取消令牌
 * @returns TextEdit 数组或 null（表示格式化失败）
 */
async function runFormat(
    document: vscode.TextDocument,
    token?: vscode.CancellationToken
): Promise<vscode.TextEdit[] | null> {
    logger.info(`Start format document: ${document.fileName}`);

    // 只传递 fileName
    const result = await getShfmtService(logger).format(document.fileName, token);

    // 格式化失败，创建诊断
    if (!result.success && result.syntaxErrors) {
        logger.info(`Format failed with syntax errors`);

        const diagnostics = DiagnosticAdapter.convert(
            result,
            document,
            PackageInfo.diagnosticSource
        );

        // 获取已有诊断并合并
        const existingDiagnostics = diagnosticCollection.get(document.uri) || [];
        const allDiagnostics = [...existingDiagnostics, ...diagnostics];
        diagnosticCollection.set(document.uri, allDiagnostics);

        return null;
    }

    // 格式化成功，清除诊断并返回 TextEdit
    diagnosticCollection.delete(document.uri);
    return FormatterAdapter.convert(result, document);
}

// ==================== 对外 API 层 ====================

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
    try {
        const edits = await runFormat(document, _token);
        return edits || [];
    } catch (error) {
        if (error instanceof ToolExecutionError) {
            const errorDiagnostic = DiagnosticAdapter.createToolExecutionError(document, error);
            logger.info(`Format error: ${String(error)}`);
            diagnosticCollection.set(document.uri, [errorDiagnostic]);
        }
        return [];
    }
}
