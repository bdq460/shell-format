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
    log('Initialize logger');
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
    log('Dispose logger');
    if (outputChannel) {
        outputChannel.dispose();
        log('Output channel disposed');
    }
}

/**
 * 输出shell命令执行结果
 * @param fullCommand 完整的命令
 * @param stdout 标准输出
 * @param stderr 错误输出
 * @param code 命令执行返回码
 */

export function logShellCommandCloseOutput(fullCommand: string, stdout: Buffer[], stderr: Buffer[], code: number | null): void {
    const stdoutStr = Buffer.concat(stdout).toString();
    const stderrStr = Buffer.concat(stderr).toString();
    log(`Command execute complete! command: ${fullCommand}\nreturnCode: ${code}\nStdout: ${stdoutStr}\nStderr: ${stderrStr}`);
}

/**
 * 输出shell命令执行错误信息
 * @param fullCommand 完整的命令
 * @param stdout 标准输出
 * @param stderr 错误输出
 * @param err 错误对象
 */
export function logShellCommandErrorOutput(fullCommand: string, stdout: Buffer[], stderr: Buffer[], err: NodeJS.ErrnoException): void {
    const stdoutStr = Buffer.concat(stdout).toString();
    const stderrStr = Buffer.concat(stderr).toString();
    log(`Command execute error! command: ${fullCommand}\nStdout: ${stdoutStr}\nStderr: ${stderrStr}, err: ${err}`);
}
