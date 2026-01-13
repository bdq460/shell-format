/**
 * 格式化命令模块
 * 提供"格式化文档"命令的实现
 */

import * as vscode from 'vscode';
import { formatDocument } from '../formatters/documentFormatter';
import { PackageInfo } from '../utils/extensionInfo';
import { log } from '../utils/logger';

/**
 * 注册格式化文档命令
 */
export function registerFormatCommand(): vscode.Disposable {
    return vscode.commands.registerCommand(
        PackageInfo.commandFormatDocument,
        async () => {
            const editor = vscode.window.activeTextEditor;
            log(`Format document command triggered! Document: ${editor?.document.fileName}`);

            if (editor) {
                await formatDocument(editor.document);
            }
        }
    );
}
