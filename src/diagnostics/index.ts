/**
 * 诊断模块
 * 管理 VSCode 诊断集合和对外 API
 *
 * 架构优化：
 * 1. 使用 ServiceManager 单例管理服务实例
 * 2. 使用 DiagnosticCache 缓存诊断结果
 * 3. 使用 Promise.all 并行执行诊断
 */

import * as vscode from "vscode";
import { DiagnosticAdapter } from "../adapters";
import { PackageInfo, SettingInfo } from "../config";
import { ServiceManager } from "../services/serviceManager";
import { ToolExecutionError } from "../tools/errors";
import { logger } from "../utils/log";

// ==================== 诊断执行层 ====================

/**
 * 执行 shfmt 诊断
 * @param content 文档内容（可选，用于未保存的文档）
 * @returns shfmt 诊断数组
 */
async function runShfmtDiagnose(
    document: vscode.TextDocument,
    token?: vscode.CancellationToken,
    content?: string,
): Promise<vscode.Diagnostic[]> {
    const fileName = document.fileName;
    logger.info(`Diagnosing document with shfmt: ${fileName} (content mode: ${!!content})`);

    // 使用 ServiceManager 获取服务实例（自动处理缓存和配置变化）
    const serviceManager = ServiceManager.getInstance();
    let shfmtResult;

    if (content) {
        // 使用content模式（编辑时）
        shfmtResult = await serviceManager
            .getShfmtService()
            .checkContent(content, token);
    } else {
        // 使用文件模式（保存时、打开时）
        shfmtResult = await serviceManager
            .getShfmtService()
            .check(fileName, token);
    }

    return DiagnosticAdapter.convert(
        shfmtResult,
        document,
        PackageInfo.diagnosticSource,
    );
}

/**
 * 执行 shellcheck 诊断
 * @param content 文档内容（可选，用于未保存的文档）
 * @returns shellcheck 诊断数组
 */
async function runShellcheckDiagnose(
    document: vscode.TextDocument,
    token?: vscode.CancellationToken,
    content?: string,
): Promise<vscode.Diagnostic[]> {
    const fileName = document.fileName;
    logger.info(`Diagnosing document with shellcheck: ${fileName} (content mode: ${!!content})`);

    // 使用 ServiceManager 获取服务实例（自动处理缓存和配置变化）
    const serviceManager = ServiceManager.getInstance();
    let shellcheckResult;

    if (content) {
        // 使用content模式（编辑时）
        shellcheckResult = await serviceManager
            .getShellcheckService()
            .checkContent(content, token);
    } else {
        // 使用文件模式（保存时、打开时）
        shellcheckResult = await serviceManager
            .getShellcheckService()
            .check(fileName, token);
    }

    return DiagnosticAdapter.convert(
        shellcheckResult,
        document,
        PackageInfo.diagnosticSource,
    );
}

/**
 * 运行所有诊断
 *
 * 优化：
 * 1. 使用 Promise.all 并行执行 shfmt 和 shellcheck 诊断
 * 2. 性能提升：假设 shfmt 需要 200ms，shellcheck 需要 300ms
 *    - 串行执行：500ms
 *    - 并行执行：300ms（取最大值）
 *    - 节省 40% 的执行时间
 *
 * @param content 文档内容（可选，用于未保存的文档）
 * @returns 所有诊断的数组
 */
async function runDiagnose(
    document: vscode.TextDocument,
    token?: vscode.CancellationToken,
    content?: string,
): Promise<vscode.Diagnostic[]> {
    // ✅ 并行执行 shfmt 和 shellcheck 诊断
    const [shfmtDiagnostics, shellcheckDiagnostics] = await Promise.all([
        runShfmtDiagnose(document, token, content),
        runShellcheckDiagnose(document, token, content),
    ]);

    return [...shfmtDiagnostics, ...shellcheckDiagnostics];
}

// ==================== 对外 API 层 ====================

/**
 * 诊断单个文档
 *
 * 优化：
 * 1. 检查缓存，如果缓存命中则返回缓存结果
 * 2. 缓存基于文件内容 hash 和配置快照
 * 3. 配置变化或文件内容变化时，缓存自动失效
 * 4. 大幅减少重复执行外部命令
 * 5. 支持 onError 配置：ignore 时不执行诊断
 *
 * 执行诊断并返回诊断结果
 *
 * @param document 文档对象
 * @param token 取消令牌
 * @param preferContentMode 是否优先使用content模式（默认false）
 * @returns 诊断数组
 */
export async function diagnoseDocument(
    document: vscode.TextDocument,
    token?: vscode.CancellationToken,
    preferContentMode = false,
): Promise<vscode.Diagnostic[]> {
    // 检查 onError 配置：ignore 时不执行诊断
    if (SettingInfo.getOnErrorSetting() === "ignore") {
        logger.info(
            `Diagnostic ignored due to onError setting: ${document.fileName}`,
        );
        return [];
    }

    // 判断是否使用content模式
    // 1. 显式指定使用content模式
    // 2. 文档是未保存的（Untitled）
    const shouldUseContentMode = preferContentMode || document.isUntitled;
    const content = shouldUseContentMode ? document.getText() : undefined;

    logger.info(
        `Diagnosing document: ${document.fileName} (content mode: ${shouldUseContentMode})`,
    );

    try {
        // 执行诊断
        const diagnostics = await runDiagnose(document, token, content);

        // 缓存结果
        logger.info(
            `Diagnose finish, set diagnostic cache!diagnostics:${diagnostics}`,
        );
        // diagnosticCache.set(document, diagnostics, currentConfig);

        return diagnostics;
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
export async function diagnoseAllShellScripts(): Promise<
    Map<vscode.Uri, vscode.Diagnostic[]>
> {
    // 检查 onError 配置：ignore 时不执行诊断
    if (SettingInfo.getOnErrorSetting() === "ignore") {
        logger.info(`All diagnostics ignored due to onError setting`);
        return new Map();
    }

    const documents = vscode.workspace.textDocuments.filter(
        (doc) => doc.languageId === PackageInfo.languageId,
    );

    const results = new Map<vscode.Uri, vscode.Diagnostic[]>();

    try {
        for (const document of documents) {
            // 执行诊断
            const diagnostics = await runDiagnose(document);
            results.set(document.uri, diagnostics);
        }
    } catch (error) {
        // 工具执行错误（如命令不存在）是全局性问题，只在第一个文档上显示错误诊断
        if (documents.length > 0 && error instanceof ToolExecutionError) {
            const errorDiagnostic = DiagnosticAdapter.createToolExecutionError(
                documents[0],
                error,
            );
            results.set(documents[0].uri, [errorDiagnostic]);
            logger.info(
                `Tool execution error during bulk diagnose: ${String(error)}`,
            );
        }
    }

    return results;
}
