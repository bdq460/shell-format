/**
 * 日志工具模块
 * 提供带时间戳的日志记录功能
 */

import * as vscode from 'vscode';
import { ConfigManager, PackageInfo } from './extensionInfo';


let outputChannel: vscode.OutputChannel;

/**
 * 初始化日志输出通道
 */
export function initializeLogger(): void {
    if (ConfigManager.getLogOutput() === 'off') {
        return;
    }
    console.log('Create output channel');
    outputChannel = vscode.window.createOutputChannel(PackageInfo.extensionName);
}

/**
 * 记录日志消息
 * @param message 日志消息
 */
export function log(message: string): void {
    if (ConfigManager.getLogOutput() === 'off') {
        return;
    }
    // 为消息增加插件名称
    message = `[${PackageInfo.extensionName}] ${message}`;
    // 为消息增加时间戳
    const timestamp = new Date().toLocaleTimeString('zh-CN', { hour12: false });
    message = `[${timestamp}] ${message}`;
    // 输出到控制台
    console.log(message);
    // 输出到输出通道
    if (outputChannel) {
        outputChannel.appendLine(message);
    }
}

/**
 * 获取输出通道
 */
export function getOutputChannel(): vscode.OutputChannel {
    return outputChannel;
}

/**
 * 销毁日志输出通道
 */
export function disposeLogger(): void {
    if (outputChannel) {
        outputChannel.dispose();
        log('Output channel disposed');
    }
}
