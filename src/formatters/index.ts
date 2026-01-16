/**
 * 文档格式化器模块
 * 提供文档格式化功能
 */

import * as vscode from 'vscode';
import { FormatterAdapter } from '../adapters';
import { getShfmtService } from '../services';
import { logger } from '../utils/log';

// ==================== 格式化执行层 ====================

/**
 * 执行格式化
 * @param document 文档对象
 * @param token 取消令牌
 * @returns TextEdit 数组
 */
async function runFormat(
    document: vscode.TextDocument,
    token?: vscode.CancellationToken
): Promise<vscode.TextEdit[]> {
    logger.info(`Start format document: ${document.fileName}`);

    // 只传递 fileName
    const result = await getShfmtService(logger).format(document.fileName, token);

    // 返回格式化结果（格式化模块不处理诊断）
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
    return await runFormat(document, _token);
}
