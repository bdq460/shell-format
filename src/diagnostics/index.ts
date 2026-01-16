/**
 * 诊断模块
 * 管理 VSCode 诊断集合和对外 API
 */

import * as vscode from 'vscode';
import { DiagnosticAdapter } from '../adapters';
import { PackageInfo } from '../config';
import { getShellcheckService, getShfmtService } from '../services';
import { ToolExecutionError } from '../tools/errors';
import { logger } from '../utils/log';

// ==================== 诊断执行层 ====================

/**
 * 执行 shfmt 诊断
 * @returns shfmt 诊断数组
 */
async function runShfmtDiagnose(
    document: vscode.TextDocument,
    token?: vscode.CancellationToken
): Promise<vscode.Diagnostic[]> {
    const fileName = document.fileName;
    logger.info(`Diagnosing document with shfmt: ${fileName}`);

    // 只传递 fileName
    const shfmtResult = await getShfmtService(logger).check(fileName, token);

    return DiagnosticAdapter.convert(
        shfmtResult,
        document,
        PackageInfo.diagnosticSource
    );
}

/**
 * 执行 shellcheck 诊断
 * @returns shellcheck 诊断数组
 */
async function runShellcheckDiagnose(
    document: vscode.TextDocument,
    token?: vscode.CancellationToken
): Promise<vscode.Diagnostic[]> {
    const fileName = document.fileName;
    logger.info(`Diagnosing document with shellcheck: ${fileName}`);

    // 只传递 fileName
    const shellcheckResult = await getShellcheckService(logger).check(fileName, token);

    return DiagnosticAdapter.convert(
        shellcheckResult,
        document,
        PackageInfo.diagnosticSource
    );
}

/**
 * 运行所有诊断
 * @returns 所有诊断的数组
 */
async function runDiagnose(
    document: vscode.TextDocument,
    token?: vscode.CancellationToken
): Promise<vscode.Diagnostic[]> {
    const diagnostics: vscode.Diagnostic[] = [];

    // Shfmt 检查格式问题
    const shfmtDiagnostics = await runShfmtDiagnose(document, token);
    diagnostics.push(...shfmtDiagnostics);

    // Shellcheck 检查语法和最佳实践问题
    const shellcheckDiagnostics = await runShellcheckDiagnose(document, token);
    diagnostics.push(...shellcheckDiagnostics);

    return diagnostics;
}

// ==================== 对外 API 层 ====================

/**
 * 诊断单个文档
 * 执行诊断并返回诊断结果
 *
 * @param document 文档对象
 * @param token 取消令牌
 * @returns 诊断数组
 */
export async function diagnoseDocument(
    document: vscode.TextDocument,
    token?: vscode.CancellationToken
): Promise<vscode.Diagnostic[]> {
    try {
        return await runDiagnose(document, token);
    } catch (error) {
        if (error instanceof ToolExecutionError) {
            return [DiagnosticAdapter.createToolExecutionError(document, error)];
        }
        return [];
    }
}

/**
 * 诊断所有打开的 Shell 脚本
 *
 * @returns 文档和诊断结果的映射
 */
export async function diagnoseAllShellScripts(): Promise<Map<vscode.Uri, vscode.Diagnostic[]>> {
    const documents = vscode.workspace.textDocuments.filter(
        doc => doc.languageId === PackageInfo.languageId
    );

    const results = new Map<vscode.Uri, vscode.Diagnostic[]>();

    try {
        for (const document of documents) {
            const diagnostics = await runDiagnose(document);
            results.set(document.uri, diagnostics);
        }
    } catch (error) {
        // 工具执行错误（如命令不存在）是全局性问题，只在第一个文档上显示错误诊断
        if (documents.length > 0 && error instanceof ToolExecutionError) {
            const errorDiagnostic = DiagnosticAdapter.createToolExecutionError(documents[0], error);
            results.set(documents[0].uri, [errorDiagnostic]);
            logger.info(`Tool execution error during bulk diagnose: ${String(error)}`);
        }
    }

    return results;
}
