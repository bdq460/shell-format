"use strict";
/**
 * 日志工具模块
 * 提供带时间戳的日志记录功能
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.initializeLogger = initializeLogger;
exports.log = log;
exports.getOutputChannel = getOutputChannel;
exports.disposeLogger = disposeLogger;
const vscode = __importStar(require("vscode"));
const extensionInfo_1 = require("./extensionInfo");
let outputChannel;
/**
 * 初始化日志输出通道
 */
function initializeLogger() {
    if (extensionInfo_1.ConfigManager.getLogOutput() === 'off') {
        return;
    }
    console.log('Create output channel');
    outputChannel = vscode.window.createOutputChannel(extensionInfo_1.PackageInfo.extensionName);
}
/**
 * 记录日志消息
 * @param message 日志消息
 */
function log(message) {
    if (extensionInfo_1.ConfigManager.getLogOutput() === 'off') {
        return;
    }
    // 为消息增加插件名称
    message = `[${extensionInfo_1.PackageInfo.extensionName}] ${message}`;
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
function getOutputChannel() {
    return outputChannel;
}
/**
 * 销毁日志输出通道
 */
function disposeLogger() {
    if (outputChannel) {
        outputChannel.dispose();
        log('Output channel disposed');
    }
}
//# sourceMappingURL=logger.js.map