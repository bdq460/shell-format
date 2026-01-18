/**
 * 诊断模块
 * 管理 VSCode 诊断集合和对外 API
 *
 * 架构优化：
 * 1. 使用 PluginManager 管理插件实例
 * 2. 直接调用 Tool 层，减少中间层
 * 3. 使用 Promise.all 并行执行诊断
 */

import * as vscode from "vscode";
import { PackageInfo, SettingInfo } from "../config";
import { PERFORMANCE_METRICS } from "../metrics";
import { getPluginManager } from "../plugins";
import { logger, startTimer } from "../utils";

// ==================== 诊断执行层 ====================

/**
 * 运行所有诊断（使用纯插件方案）
 *
 * 优化：
 * 1. PluginManager 内部会自动并行调用所有活动的插件
 * 2. 性能提升：假设 shfmt 需要 200ms，shellcheck 需要 300ms
 *    - 串行执行：500ms
 *    - 并行执行：300ms（取最大值）
 *    - 节省 40% 的执行时间
 *
 * @param document 文档对象
 * @param token 取消令牌
 * @param useContentMode 是否使用content模式（未使用，纯插件方案总是使用content模式）
 * @returns 所有诊断的数组
 */
async function runDiagnose(
    document: vscode.TextDocument,
    token?: vscode.CancellationToken,
): Promise<vscode.Diagnostic[]> {
    logger.info(`Diagnosing document: ${document.fileName}`);

    const timer = startTimer(PERFORMANCE_METRICS.DIAGNOSE_ONE_DOC_DURATION);
    try {
        const pluginManager = getPluginManager();

        const result = await pluginManager.check(document, {
            token,
            timeout: undefined,
        });

        timer.stop();
        logger.debug(`Diagnose returned ${result.diagnostics.length} diagnostics`);
        return result.diagnostics;
    } catch (error) {
        timer.stop();
        logger.error(`Diagnose failed: ${String(error)}`);
        return [];
    }
}

// ==================== 对外 API 层 ====================

/**
 * 诊断单个文档
 *
 * 优化：
 * 1. 检查 onError 配置：ignore 时不执行诊断
 * 2. 性能监控：记录诊断执行时间
 *
 * 执行诊断并返回诊断结果
 *
 * @param document 文档对象
 * @param token 取消令牌
 * @param preferContentMode 是否优先使用content模式（未使用，纯插件方案总是使用content模式）
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

    logger.info(`Diagnosing document: ${document.fileName}`);

    try {
        // 执行诊断（带性能监控）
        const diagnostics = await runDiagnose(document, token);

        logger.info(
            `Diagnose completed for ${document.fileName}, ${diagnostics.length} diagnostics`,
        );

        return diagnostics;
    } catch (error) {
        logger.error(`Diagnose failed for ${document.fileName}: ${String(error)}`);
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
        const timer = startTimer(PERFORMANCE_METRICS.DIAGNOSE_ALL_DOCS_DURATION);
        for (const document of documents) {
            // 执行诊断
            const diagnostics = await runDiagnose(document);
            results.set(document.uri, diagnostics);
        }
        timer.stop();
        logger.info(`Diagnosed all ${documents.length} shell documents`);
    } catch (error) {
        logger.error(`Bulk diagnose failed: ${String(error)}`);
    }

    return results;
}
