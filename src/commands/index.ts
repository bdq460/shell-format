/**
 * 命令注册器
 * 统一注册所有命令
 */

import * as vscode from 'vscode';
import { log } from '../utils/logger';
import { registerFixAllCommand } from './fixCommand';

/**
 * 注册所有命令
 */
export function registerAllCommands(): vscode.Disposable[] {
    log('Registering all commands');
    return [
        // 不需要注册格式化文档命令, extension.ts中注册了DocumentRangeFormattingEditProvider
        // registerFormatCommand(),
        registerFixAllCommand()
    ];
}
