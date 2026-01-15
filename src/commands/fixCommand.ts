/**
 * 修复命令模块
 * 提供"修复所有问题"命令的实现
 */

import * as vscode from 'vscode';
import { PackageInfo } from '../config';
import { getDiagnosticCollection } from '../diagnostics';
import { formatDocument } from '../formatters';
import { logger } from '../utils/log';

/**
 * 注册修复所有问题命令
 * 其实也是调用的格式化文档命令
 */
export function registerFixAllCommand(): vscode.Disposable {
    logger.info('Registering fix all problems command');
    return vscode.commands.registerCommand(
        PackageInfo.commandFixAllProblems,
        async (uri?: vscode.Uri) => {

            logger.info(`Start fix all problems! URI: ${uri}`);
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
            if (!document) {
                logger.info('Fix all problems command triggered! No document found');
                return;
            }

            logger.info(`Start fix all problems for: ${document.fileName}`);

            // 通过formatDocument生成修复操作
            logger.info('Generating fixes by invoking format document');
            const edits = await formatDocument(document);
            if (edits && edits.length > 0) {
                logger.info(`Applying ${edits.length} formatting fix(es)`);
                // 创建 WorkspaceEdit用于存储修复操作
                const edit = new vscode.WorkspaceEdit();
                for (const textEdit of edits) {
                    // 将修复操作添加到 WorkspaceEdit
                    edit.replace(document.uri, textEdit.range, textEdit.newText);
                }
                // 应用修复操作
                await vscode.workspace.applyEdit(edit);
                // 显示成功消息
                vscode.window.showInformationMessage(
                    "All problems fixed successfully."
                );
            } else if (edits && edits.length === 0) {
                logger.info('No formatting fixes return.');
                const diagnostics = getDiagnosticCollection().get(document.uri) || [];
                const hasDiagnostics = diagnostics.length > 0;
                if (hasDiagnostics) {
                    logger.info('No formatting fixes needed, but diagnostics found.');
                    vscode.window.showWarningMessage(
                        `Formatting failed with warnings. Check the Problems panel.`
                    );
                } else {
                    logger.info('No formatting fixes needed.');
                }
            }
        }
    );
}
