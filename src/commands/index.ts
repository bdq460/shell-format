/**
 * 命令注册器
 * 统一注册所有命令
 */

import * as vscode from 'vscode';
import { registerFixAllCommand } from './fixCommand';
import { registerFormatCommand } from './formatCommand';

/**
 * 注册所有命令
 */
export function registerAllCommands(): vscode.Disposable[] {
    return [
        registerFormatCommand(),
        registerFixAllCommand()
    ];
}
