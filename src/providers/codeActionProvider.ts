/**
 * Code Actions 提供者
 * 提供快速修复和修复所有问题的功能
 */

import * as vscode from 'vscode';
import { PackageInfo } from '../utils/extensionInfo';

/**
 * ShellFormat Code Action 提供者
 */
export class ShellFormatCodeActionProvider implements vscode.CodeActionProvider {
    /**
     * 提供 Code Actions
     */
    public provideCodeActions(
        document: vscode.TextDocument,
        _range: vscode.Range | vscode.Selection,
        context: vscode.CodeActionContext,
        _token: vscode.CancellationToken
    ): vscode.ProviderResult<(vscode.CodeAction | vscode.Command)[]> {
        const actions: vscode.CodeAction[] = [];

        // 为每个诊断创建快速修复
        if (context.diagnostics) {
            for (const diagnostic of context.diagnostics) {
                if (diagnostic.source === PackageInfo.diagnosticSource) {
                    const fixThisAction = new vscode.CodeAction(
                        PackageInfo.codeActionQuickFixTitle,
                        vscode.CodeActionKind.QuickFix
                    );
                    fixThisAction.diagnostics = [diagnostic];
                    fixThisAction.isPreferred = true;
                    fixThisAction.command = {
                        title: PackageInfo.codeActionQuickFixTitle,
                        command: PackageInfo.commandFixAllProblems,
                        arguments: [document.uri]
                    };
                    actions.push(fixThisAction);
                }
            }
        }

        // 修复所有问题的快速修复
        const fixAllAction = new vscode.CodeAction(
            PackageInfo.codeActionFixAllTitle,
            vscode.CodeActionKind.SourceFixAll
        );
        fixAllAction.command = {
            title: PackageInfo.codeActionFixAllTitle,
            command: PackageInfo.commandFixAllProblems,
            arguments: [document.uri]
        };
        actions.push(fixAllAction);

        return actions;
    }
}
