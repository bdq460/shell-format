/**
 * 诊断模块
 * 使用 shfmt 和 shellcheck 检测 Shell 脚本问题
 */

import * as vscode from 'vscode';
import { ShfmtTool } from '../tools/shfmt';
import { ShellcheckTool } from '../tools/shellcheck';
import { DiagnosticAdapter, LoggerAdapter } from '../adapters';
import { ConfigManager, PackageInfo } from '../utils/extensionInfo';
import { log } from '../utils/logger';
import { createSpawnErrorDiagnostic } from '../utils/spawnErrorHandler';

let diagnosticCollection: vscode.DiagnosticCollection;
const shfmtTool = new ShfmtTool();
const shellcheckTool = new ShellcheckTool();
const loggerAdapter = new LoggerAdapter();

/**
 * 获取诊断集合
 */
export function getDiagnosticCollection(): vscode.DiagnosticCollection {
    return diagnosticCollection;
}

/**
 * 初始化诊断模块
 */
export function initializeDiagnostics(diagnosticCol: vscode.DiagnosticCollection): void {
    diagnosticCollection = diagnosticCol;
}

/**
 * 诊断单个文档
 * @param document 文档对象
 * @param token 取消令牌
 */
export async function diagnoseDocument(
    document: vscode.TextDocument,
    token?: vscode.CancellationToken
): Promise<void> {
    const fileName = document.fileName;
    const diagnostics: vscode.Diagnostic[] = [];

    try {
        log(`Diagnosing document: ${fileName}`);

        // Shfmt 检查格式问题
        const shfmtResult = await shfmtTool.check(
            document.getText(),
            {
                commandPath: ConfigManager.getShfmtPath(),
                indent: getIndentSize(),
                binaryNextLine: true,
                caseIndent: true,
                spaceRedirects: true,
                logger: loggerAdapter
            }
        );

        diagnostics.push(...DiagnosticAdapter.convert(
            shfmtResult,
            document,
            PackageInfo.diagnosticSource
        ));

        // Shellcheck 检查语法和最佳实践问题
        const shellcheckResult = await shellcheckTool.check(
            document.getText(),
            {
                commandPath: ConfigManager.getShellcheckPath(),
                logger: loggerAdapter
            }
        );

        diagnostics.push(...DiagnosticAdapter.convert(
            shellcheckResult,
            document,
            PackageInfo.diagnosticSource
        ));

        // 设置诊断
        diagnosticCollection.set(document.uri, diagnostics);

    } catch (error) {
        // 处理执行错误（如进程启动失败）
        if (error instanceof Error) {
            log(`Diagnose error for ${fileName}: ${error.message}`);

            // 创建错误诊断
            const errorDiagnostic = createSpawnErrorDiagnostic(
                document,
                PackageInfo.diagnosticSource,
                `diagnose ${fileName}`,
                error as NodeJS.ErrnoException
            );

            if (errorDiagnostic) {
                diagnosticCollection.set(document.uri, [errorDiagnostic]);
            }
        }
    }
}

/**
 * 诊断所有打开的 Shell 脚本
 */
export async function diagnoseAllShellScripts(): Promise<void> {
    log('Diagnosing all open shell scripts');

    const documents = vscode.workspace.textDocuments.filter(
        doc => doc.languageId === PackageInfo.languageId
    );

    for (const document of documents) {
        await diagnoseDocument(document);
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
