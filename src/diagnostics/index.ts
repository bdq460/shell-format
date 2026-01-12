/**
 * 诊断管理器模块
 * 统一管理所有诊断功能
 */

import * as path from 'path';
import * as vscode from 'vscode';
import { ConfigManager } from '../utils/extensionInfo';
import { log } from '../utils/logger';
import { checkWithShellcheck } from './shellcheck';
import { checkFormat } from './shfmt';

let diagnosticCollection: vscode.DiagnosticCollection;

/**
 * 初始化诊断管理器
 */
export function initializeDiagnostics(diagCol: vscode.DiagnosticCollection): void {
    diagnosticCollection = diagCol;
}

/**
 * 对文档进行诊断
 */
export async function diagnoseDocument(document: vscode.TextDocument): Promise<void> {
    const fileName = path.basename(document.fileName);
    log(`Starting diagnosis for: ${fileName}`);

    const onError = ConfigManager.getOnErrorSetting();
    log(`onError setting: ${onError}`);

    if (onError !== 'showProblem') {
        log(`Skipping diagnosis (onError=${onError})`);
        diagnosticCollection.delete(document.uri);
        return;
    }

    diagnosticCollection.delete(document.uri);
    const allDiagnostics: vscode.Diagnostic[] = [];

    // 步骤1: 使用 shellcheck 检查
    const shellcheckErrors = await checkWithShellcheck(document);
    allDiagnostics.push(...shellcheckErrors);

    // 步骤2: 使用 shfmt 检查
    const formatErrors = await checkFormat(document);
    allDiagnostics.push(...formatErrors);

    if (allDiagnostics.length > 0) {
        diagnosticCollection.set(document.uri, allDiagnostics);
        log(`Diagnostics created. found ${allDiagnostics.length} issues.`);
    } else {
        log(`No issues found for: ${fileName}`);
    }
}

/**
 * 诊断所有打开的 Shell 脚本
 */
export function diagnoseAllShellScripts(): void {
    vscode.workspace.textDocuments.forEach((document) => {
        if (document.languageId === 'shellscript') {
            diagnoseDocument(document);
        }
    });
}

/**
 * 销毁诊断管理器
 */
export function disposeDiagnostics(): void {
    if (diagnosticCollection) {
        diagnosticCollection.dispose();
        log('Diagnostic collection disposed');
    }
}

/**
 * 获取诊断集合
 */
export function getDiagnosticCollection(): vscode.DiagnosticCollection {
    return diagnosticCollection;
}
