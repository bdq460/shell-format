/**
 * 日志适配器
 * 将 VSCode 输出通道适配为统一的日志接口
 */

import * as vscode from 'vscode';
import { PackageInfo, SettingInfo } from '../config';
import { Logger, setLogger } from '../utils/log';

// export let logger: LoggerAdapter

/**
 * 初始化日志输出通道
 */
export function initializeLoggerAdapter(): void {
    console.log('Initialize logger');
    // 设置log模块logger
    setLogger(new LoggerAdapter());
}

/**
 * 日志适配器
 * 将插件日志系统适配到基础层 Logger 接口
 */
export class LoggerAdapter implements Logger, vscode.Disposable {

    private outputChannel: vscode.OutputChannel | undefined;

    info(message: string): void {
        this.logMessage(message, 'INFO');
    }

    error(message: string): void {
        this.logMessage(message, 'ERROR');
    }

    debug(message: string): void {
        this.logMessage(message, 'DEBUG');
    }

    logMessage(message: string, level: string) {
        if (SettingInfo.getLogOutput() === 'off') {
            return;
        }
        // 为消息增加消息级别
        message = `[${level}] ${message}`;
        // 为消息增加插件名称
        message = `[${PackageInfo.extensionName}]${message}`;
        // 为消息增加时间戳
        const timestamp = new Date().toLocaleTimeString('zh-CN', { hour12: false });

        // 输出到控制台 (可以从"帮助 -> 切换开发人员"工具打开控制台界面)
        console.log(message);

        // 输出到输出通道
        if (!this.outputChannel) {
            this.outputChannel = vscode.window.createOutputChannel(PackageInfo.extensionName);
        }
    }

    dispose() {
        this.info("logger dispose.")
        if (this.outputChannel) {
            this.info("logger outputChannel not null , start to dispose output channel.")
            this.outputChannel.dispose();
        }
    }
}
