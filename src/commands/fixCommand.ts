/**
 * 修复命令模块
 * 提供"修复所有问题"命令的实现
 */

import * as vscode from 'vscode';
import { formatDocument } from '../formatters/documentFormatter';
import { PackageInfo } from '../utils/extensionInfo';

/**
 * 注册修复所有问题命令
 */
export function registerFixAllCommand(): vscode.Disposable {
    return vscode.commands.registerCommand(
        PackageInfo.commandFixAllProblems,
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
}
