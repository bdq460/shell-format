"use strict";
/**
 * Shell Format VSCode Extension
 * 基于 shfmt 和 shellcheck 的 Shell 脚本格式化插件
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
exports.activate = activate;
exports.deactivate = deactivate;
const path = __importStar(require("path"));
const vscode = __importStar(require("vscode"));
const commands_1 = require("./commands");
const diagnostics_1 = require("./diagnostics");
const documentFormatter_1 = require("./formatters/documentFormatter");
const codeActionProvider_1 = require("./providers/codeActionProvider");
const extensionInfo_1 = require("./utils/extensionInfo");
const logger_1 = require("./utils/logger");
/**
 * 检查是否应该跳过该文件
 * VSCode 编辑器中打开 Git 冲突文件时（如 example.sh.git），文件名会以 .git 结尾。
 * 打开的文件名是.sh 的文件，但是内部文件名其实是.git结尾的,对于这种要进行过滤
 * @param fileName 文件名
 * @returns 如果应该跳过返回 true，否则返回 false
 */
function shouldSkipFile(fileName) {
    const baseName = path.basename(fileName);
    // 跳过 Git 冲突文件、临时文件等
    const skipPatterns = [
        /\.git$/, // Git 冲突文件
        /\.swp$/, // Vim 临时文件
        /\.swo$/, // Vim 交换文件
        /~$/, // 备份文件
        /\.tmp$/, // 临时文件
        /\.bak$/, // 备份文件
    ];
    return skipPatterns.some(pattern => pattern.test(baseName));
}
// 防抖定时器
let debounceTimer;
/**
 * 扩展激活函数
 */
function activate(context) {
    (0, logger_1.log)('Extension is now active');
    // 初始化日志
    (0, logger_1.initializeLogger)();
    // 创建诊断集合
    //
    // 什么是 DiagnosticCollection？
    //  DiagnosticCollection 是 VSCode 提供的用于管理诊断信息（错误、警告、提示）的 API。
    //
    // DiagnosticCollection 的作用
    //  - 显示诊断信息：在编辑器中显示错误、警告、提示
    //  - 统一管理：集中管理所有文档的诊断信息
    //  - 问题面板：在"问题"面板中显示所有诊断
    //  - 代码提示：在代码中显示波浪线和灯泡图标
    // DiagnosticCollection在插件退出时要被清理
    // DiagnosticCollection 实现了 Disposable 接口，需要调用 dispose() 来释放资源：
    //  - 内存占用：保存大量诊断信息占用内存
    //  - UI 资源：编辑器中的波浪线、灯泡图标等 UI 元素
    //  - 事件监听：内部可能有事件监听器
    (0, logger_1.log)('Diagnostic collection created');
    const diagnosticCollection = vscode.languages.createDiagnosticCollection(extensionInfo_1.PackageInfo.extensionName);
    // 初始化各模块
    (0, diagnostics_1.initializeDiagnostics)(diagnosticCollection);
    (0, documentFormatter_1.initializeFormatter)(diagnosticCollection);
    // 注册文档格式化提供者
    // DocumentFormattingEditProvider 接口用于提供文档格式化功能
    // 当用户从命令面板或右键菜单选择"格式化文档(Format Document)"或"格式化选定内容(Format Selection)"时
    // VSCode 会调用 provideDocumentFormattingEdits() 方法
    // provideDocumentFormattingEdits() 方法返回一个 TextEdit[]，表示格式化后的文本
    // vscode会自动应用这些编辑更新原始文档
    (0, logger_1.log)('Registering document formatting provider');
    const formatProvider = vscode.languages.registerDocumentFormattingEditProvider(extensionInfo_1.PackageInfo.languageId, {
        provideDocumentFormattingEdits(document, options, token) {
            // 跳过特殊文件
            if (shouldSkipFile(document.fileName)) {
                (0, logger_1.log)(`Skipping formatting for: ${document.fileName} (special file)`);
                return [];
            }
            (0, logger_1.log)(`Document formatting triggered for: ${document.fileName}`);
            return (0, documentFormatter_1.formatDocument)(document, options, token);
        }
    });
    // 注册文档范围格式化提供者（用于格式化选中文本）
    (0, logger_1.log)('Registering document range formatting provider');
    const rangeFormatProvider = vscode.languages.registerDocumentRangeFormattingEditProvider(extensionInfo_1.PackageInfo.languageId, {
        provideDocumentRangeFormattingEdits(document, range, options, token) {
            // 跳过特殊文件
            if (shouldSkipFile(document.fileName)) {
                (0, logger_1.log)(`Skipping range formatting for: ${document.fileName} (special file)`);
                return [];
            }
            (0, logger_1.log)(`Document range formatting triggered for: ${document.fileName}, range: [${range.start.line}, ${range.start.character}] - [${range.end.line}, ${range.end.character}]`);
            return (0, documentFormatter_1.formatDocumentRange)(document, range, options, token);
        }
    });
    // 注册 Code Actions 提供者
    (0, logger_1.log)('Registering code actions provider');
    const codeActionProvider = vscode.languages.registerCodeActionsProvider(extensionInfo_1.PackageInfo.languageId, new codeActionProvider_1.ShellFormatCodeActionProvider(), {
        providedCodeActionKinds: [
            vscode.CodeActionKind.QuickFix,
            vscode.CodeActionKind.SourceFixAll
        ]
    });
    // 注册所有命令
    (0, logger_1.log)('Registering commands');
    const commands = (0, commands_1.registerAllCommands)();
    // 监听文档保存时进行诊断
    (0, logger_1.log)('Registering document save listener');
    const saveListener = vscode.workspace.onDidSaveTextDocument(async (document) => {
        if (document.languageId === extensionInfo_1.PackageInfo.languageId) {
            // 跳过特殊文件
            if (shouldSkipFile(document.fileName)) {
                (0, logger_1.log)(`Skipping save diagnosis for: ${document.fileName} (special file)`);
                return;
            }
            (0, logger_1.log)(`Document saved: ${document.fileName}`);
            await (0, diagnostics_1.diagnoseDocument)(document);
        }
    });
    // 监听文档打开时进行诊断
    (0, logger_1.log)('Registering document open listener');
    const openListener = vscode.workspace.onDidOpenTextDocument(async (document) => {
        if (document.languageId === extensionInfo_1.PackageInfo.languageId) {
            // 跳过特殊文件
            if (shouldSkipFile(document.fileName)) {
                (0, logger_1.log)(`Skipping open diagnosis for: ${document.fileName} (special file)`);
                return;
            }
            (0, logger_1.log)(`Document opened: ${document.fileName}`);
            await (0, diagnostics_1.diagnoseDocument)(document);
        }
    });
    // 监听文档内容变化时进行诊断（防抖）
    (0, logger_1.log)('Registering document change listener');
    const changeListener = vscode.workspace.onDidChangeTextDocument(async (event) => {
        if (event.document.languageId === extensionInfo_1.PackageInfo.languageId) {
            // 跳过特殊文件
            if (shouldSkipFile(event.document.fileName)) {
                (0, logger_1.log)(`Skipping change diagnosis for: ${event.document.fileName} (special file)`);
                return;
            }
            (0, logger_1.log)(`Document changed: ${event.document.fileName}`);
            debounceDiagnose(event.document);
        }
    });
    // 监听配置变化
    (0, logger_1.log)('Registering configuration change listener');
    const configChangeListener = vscode.workspace.onDidChangeConfiguration(async (event) => {
        if (extensionInfo_1.ConfigManager.isConfigurationChanged(event)) {
            (0, logger_1.log)('Configuration changed, re-diagnosing...');
            (0, diagnostics_1.diagnoseAllShellScripts)();
        }
    });
    // 诊断所有打开的 shell 脚本
    (0, logger_1.log)('Diagnosing all open shell scripts');
    (0, diagnostics_1.diagnoseAllShellScripts)();
    // 退出时清理
    // 自动清理机制
    //     vscode.ExtensionContext.subscriptions 是一个 Disposable 数组
    //     当扩展被停用时，VSCode 会自动调用每个 disposable 的 dispose() 方法。
    //
    // 清理时机
    // VSCode 会在以下情况自动调用 deactivate() 并清理 subscriptions：
    //  - 关闭 VSCode 窗口
    //  - 禁用扩展
    //  - 重新加载窗口（Reload Window）
    //  - 卸载扩展
    context.subscriptions.push(formatProvider, rangeFormatProvider, codeActionProvider, ...commands, saveListener, openListener, changeListener, configChangeListener, diagnosticCollection);
}
/**
 * 防抖（Debounce）诊断
 * 用于延迟执行文档诊断，避免在用户快速输入时频繁触发诊断操作
 * 在事件被连续触发时，只在最后一次触发后的指定时间间隔结束后才执行回调函数。
 * 用户输入:  A    B  C   D
 *   时间轴: |----|--|---|---------> 500ms
 *   诊断触发:                       ✓ (只在D之后500ms触发一次)
 */
function debounceDiagnose(document, delay = 500) {
    if (debounceTimer) {
        // 清除之前的定时器，避免重复触发, 确保只有最后一次触发产生的定时器可以保留下来
        clearTimeout(debounceTimer);
    }
    debounceTimer = setTimeout(() => {
        (0, diagnostics_1.diagnoseDocument)(document);
    }, delay);
}
/**
 * 扩展停用函数
 *
 * 清理说明：
 * - context.subscriptions 中的资源由 VSCode 自动清理
 * - debounceTimer 需要手动清理
 * - logger 需要手动清理
 */
function deactivate() {
    (0, logger_1.log)('Extension is now deactivated');
    // 清理日志输出通道
    (0, logger_1.disposeLogger)();
    // 清理防抖定时器
    if (debounceTimer) {
        clearTimeout(debounceTimer);
        (0, logger_1.log)('Debounce timer cleared');
    }
}
//# sourceMappingURL=extension.js.map