/**
 * Shell Format VSCode Extension
 * 基于 shfmt 和 shellcheck 的 Shell 脚本格式化插件
 */

import * as path from "path";
import * as vscode from "vscode";
import {
    initializeLoggerAdapter,
    LoggerAdapter,
} from "./adapters/loggerAdapter";
import { registerAllCommands } from "./commands";
import { PackageInfo, SettingInfo } from "./config";
import { diagnoseAllShellScripts, diagnoseDocument } from "./diagnostics";
import { formatDocument } from "./formatters";
import { ShellFormatCodeActionProvider } from "./providers";
import { ServiceManager } from "./services/serviceManager";
import { logger } from "./utils/log";

/**
 * 检查是否应该跳过该文件
 * VSCode 编辑器中打开 Git 冲突文件时（如 example.sh.git），文件名会以 .git 结尾。
 * 打开的文件名是.sh 的文件，但是内部文件名其实是.git结尾的,对于这种要进行过滤
 * @param fileName 文件名
 * @returns 如果应该跳过返回 true，否则返回 false
 */
function shouldSkipFile(fileName: string): boolean {
    const baseName = path.basename(fileName);

    // 跳过 Git 冲突文件、临时文件等
    const skipPatterns = [
        /\.git$/, // Git 冲突文件
        /\.swp$/, // Vim 临时文件
        /\.swo$/, // Vim 交换文件
        /~$/, // 备份文件
        /\.tmp$/, // 临时文件
        /\.bak$/, // 备份文件
        /^extension-output-/, // VSCode 扩展开发输出文件
    ];

    return skipPatterns.some((pattern) => pattern.test(baseName));
}

// 防抖定时器 Map (key: document URI string, value: timer)
const debounceTimers = new Map<string, NodeJS.Timeout>();

/**
 * 扩展激活函数
 */
export function activate(context: vscode.ExtensionContext) {
    console.log("Start initialize logger");
    // 初始化日志
    initializeLoggerAdapter();

    logger.info("Extension is now active");

    // 创建诊断集合
    //
    // 什么是 DiagnosticCollection？
    // DiagnosticCollection 是 VSCode 提供的用于管理诊断信息（错误、警告、提示）的 API。
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
    logger.info("Diagnostic collection created");
    const diagnosticCollection = vscode.languages.createDiagnosticCollection(
        PackageInfo.extensionName,
    );

    // 注册文档格式化提供者
    // 通过快捷键,或命令面板中或选中代码后的右键菜单中调用Format Document 命令时调用会触发注册的函数
    //
    // DocumentFormattingEditProvider 接口用于提供文档格式化功能
    //
    // 触发条件：
    //  快捷键: 用户按下格式化文档快捷键（默认是 Cmd + Shift + F / Ctrl + Shift + F）
    //  命令面板: 用户从命令面板选择"格式化文档"
    //  保存时: 如果配置了 editor.formatOnSave
    //  粘贴时: 如果配置了 editor.formatOnPaste
    //  输入时: 如果配置了 editor.formatOnType
    //  自动保存: 文件自动保存时触发
    //
    // 格式化结果应用:
    // provideDocumentFormattingEdits() 方法返回一个 TextEdit[]，表示格式化后的文本
    // vscode会自动应用这些编辑更新原始文档
    //
    // 注意:
    //  Note: A document range provider is also a document formatter which means there is no need to register a document formatter when also registering a range provider.
    //  注意：文档范围提供者也同时是文档格式化提供者，因此当注册范围提供者时不需要单独注册格式化提供者。

    //  因此如果调用registerDocumentRangeFormattingEditProvider注册了范围提供者:
    //  1. 不需要再registerDocumentFormattingEditProvider
    //  2. 不需要再注册shell-format.formatDocument命令, 因为默认格式化命令已经可以满足格式化需求
    // logger.info('Registering document formatting provider');
    // const formatProvider = vscode.languages.registerDocumentFormattingEditProvider(
    //     PackageInfo.languageId,
    //     {
    //         provideDocumentFormattingEdits(
    //             document: vscode.TextDocument,
    //             options: vscode.FormattingOptions,
    //             token: vscode.CancellationToken
    //         ): vscode.ProviderResult<vscode.TextEdit[]> {
    //             logger.info(`Document formatting triggered! Document: ${document.fileName}`);
    //             // 跳过特殊文件
    //             if (shouldSkipFile(document.fileName)) {
    //                 logger.info(`Skipping formatting for: ${document.fileName} (special file)`);
    //                 return [];
    //             }
    //             return formatDocument(document, options, token);
    //         }
    //     }
    // );

    // 注册文档范围格式化提供者（用于格式化选中文本）
    // 通过选中代码后, 从命令面板或右键菜单选择"格式化选中文本(Format Selection)"时调用会触发注册的函数
    //
    // DocumentRangeFormattingEditProvider 接口用于提供文档范围格式化功能
    // 当用户从命令面板或右键菜单选择"格式化选中文本(Format Selection)"时
    // VSCode 会调用 provideDocumentRangeFormattingEdits() 方法
    // provideDocumentRangeFormattingEdits() 方法返回一个 TextEdit[]，表示格式化后的文本
    // vscode会自动应用这些编辑更新原始文档
    //
    // 注意：Shell 脚本的格式化需要完整的上下文（if/fi、do/done 等配对），
    // 因此即使只选中部分文本，也需要对整个文档进行格式化。
    // VSCode 会自动裁剪 TextEdit，只应用选区内的变更。
    logger.info("Registering document range formatting provider");
    const rangeFormatProvider =
        vscode.languages.registerDocumentRangeFormattingEditProvider(
            PackageInfo.languageId,
            {
                provideDocumentRangeFormattingEdits(
                    document: vscode.TextDocument,
                    range: vscode.Range,
                    options: vscode.FormattingOptions,
                    token: vscode.CancellationToken,
                ): vscode.ProviderResult<vscode.TextEdit[]> {
                    // 防御性检查：确保语言类型匹配（虽然 VSCode 已过滤，但保持代码一致性）
                    if (document.languageId !== PackageInfo.languageId) {
                        return [];
                    }
                    // 跳过特殊文件
                    if (shouldSkipFile(document.fileName)) {
                        logger.info(
                            `Skipping range formatting for: ${document.fileName} (special file)`,
                        );
                        return [];
                    }
                    logger.info(
                        `Document range formatting triggered! Document: ${document.fileName}, range: [${range.start.line}, ${range.start.character}] - [${range.end.line}, ${range.end.character}]`,
                    );
                    logger.info(
                        `Note: Shell script formatting requires full document context, will format entire document`,
                    );
                    return formatDocument(document, options, token);
                },
            },
        );

    // 注册 Code Actions 类型提供者
    // 1. PackageInfo.languageId,: 绑定特定语言
    // 2. CodeActionProvider的作用: 绑定Code Actions与具体执行命令名称(注意不是实现,只绑定是命令名称)
    // 3. providedCodeActionKinds: 声明支持的 Code Actions 类型, 用于过滤哪些 Code Actions 类型需要调用你的 provider
    //    - QuickFix 类型：修复单个问题
    //    - SourceFixAll 类型：修复所有问题
    //
    // CodeActionProvider的作用
    // 当触发特定动作时, VSCode会调用CodeActionProvider的provideCodeActions()方法,返回所有绑定了具体执行命令名称的CodeAction，
    //
    // 触发时机
    // VS Code 会在以下情况调用 provideCodeActions：
    // 1. 右键点击代码 → 显示上下文菜单
    // 2. 点击灯泡图标 💡 → 显示快速修复选项
    // 3. 按 Cmd +. / Ctrl +. → 显示快速修复面板
    // 4. 保存文件时（如果配置了 editor.codeActionsOnSave）
    // 5. 编辑器焦点变化时（VS Code 可能会预先获取）
    //
    // providedCodeActionKinds 的作用
    // providedCodeActionKinds 的作用是过滤，不是绑定实现。
    // 1. 性能优化 - 避免不必要的调用, 当用户触发 CodeAction 时，VSCode 会询问所有注册的 CodeActionProvider。
    //    通过设置 providedCodeActionKinds 可以减少不必要的计算。
    //    * 如果不设置providedCodeActionKinds
    //      - 当用户点击灯泡图标时, VSCode调用所有provider→你的provider被调用→返回所有 action
    //    * 如果设置了providedCodeActionKinds[QuickFix]
    //      - 用户保存文件时 → VS Code 只请求 SourceFixAll → 跳过你的 provider
    //      - 用户右键点击 → VS Code 请求 QuickFix → 调用你的 provider
    // 2. 过滤 - 精确匹配配置
    //    当用户配置了 editor.codeActionsOnSave：
    //    {
    //      "editor.codeActionsOnSave": {
    //      "source.fixAll": "explicit",
    //        "source.fixAll.shell-format": "always"
    //    }
    //    VS Code 会：
    //      - 只调用声明了 providedCodeActionKinds: [..., SourceFixAll] 的 provider
    //      - 过滤掉没有声明 SourceFixAll 的 provider
    // 3. 工作流程示例
    //    假设有两个扩展：
    //     - Extension A: providedCodeActionKinds: [QuickFix]
    //     - Extension B(你的): providedCodeActionKinds: [QuickFix, SourceFixAll.append('shell-format')]
    //
    //    |用户操作|调用A|	调用你的扩展|
    //    | :-----: | :--: | :-------: |
    //    |保存文件（请求 SourceFixAll|✗|✓|
    //    |保存文件（请求 SourceFixAll.shell - format|✗|✓|
    //
    // QuickFix 和 SourceFixAll 的区别
    //
    // vscode.CodeActionKind.QuickFix
    //  - 用途：修复特定的、局部的问题
    //  - 触发方式：在代码中右键或按 Cmd +.时显示的灯泡菜单
    //  - 不需要自定义子类型，因为它不通过 codeActionsOnSave 触发
    //
    // vscode.CodeActionKind.SourceFixAll.${PackageInfo.extensionName}
    //   - 用途：修复整个文档的所有问题
    //   - 触发方式：通过 editor.codeActionsOnSave 配置在保存时自动执行
    //   - 需要自定义子类型（如.append('shell-format')），这样才能在 codeActionsOnSave 中精确控制
    //
    // 为什么不需要给 QuickFix append？
    // 1. QuickFix 不在 codeActionsOnSave 中使用
    //    editor.codeActionsOnSave 只支持 SourceFixAll 类型的 CodeAction，不支持 QuickFix 类型。
    // 2. QuickFix 是用户手动触发的, 此时不需要区分是哪个扩展的 QuickFix，因为用户已经选中了文档或问题。
    //    当你在代码上看到错误提示时：
    //    - 点击灯泡图标 💡
    //    - 或按 Cmd +. / Ctrl +.
    //
    logger.info("Registering code actions provider!");
    const codeActionProvider = vscode.languages.registerCodeActionsProvider(
        PackageInfo.languageId,
        new ShellFormatCodeActionProvider(diagnosticCollection),
        {
            providedCodeActionKinds: [
                vscode.CodeActionKind.QuickFix,
                vscode.CodeActionKind.SourceFixAll.append(PackageInfo.extensionName),
            ],
        },
    );

    // 注册所有命令
    // 绑定命令名称和具体实现
    logger.info("Registering commands");
    const commands = registerAllCommands(diagnosticCollection);

    // 监听文档保存时进行诊断
    logger.info("Registering document save listener");
    const saveListener = vscode.workspace.onDidSaveTextDocument(
        async (document) => {
            // 只处理 shell 语言文件
            if (document.languageId !== PackageInfo.languageId) {
                return;
            }
            // 跳过特殊文件
            if (shouldSkipFile(document.fileName)) {
                logger.info(
                    `Skipping save diagnosis for: ${document.fileName} (special file)`,
                );
                return;
            }
            logger.info(`Document saved: ${document.fileName}`);

            // 清除该文档的防抖定时器，避免被后续的防抖诊断覆盖
            const uri = document.uri.toString();
            const existingTimer = debounceTimers.get(uri);
            if (existingTimer) {
                clearTimeout(existingTimer);
                debounceTimers.delete(uri);
                logger.info(
                    `Cleared debounce timer for saved document: ${document.fileName}`,
                );
            }

            const diagnostics = await diagnoseDocument(document);
            diagnosticCollection.set(document.uri, diagnostics);
        },
    );

    // 监听文档打开时进行诊断
    logger.info("Registering document open listener");
    const openListener = vscode.workspace.onDidOpenTextDocument(
        async (document) => {
            // 只处理 shell 语言文件
            if (document.languageId !== PackageInfo.languageId) {
                return;
            }
            // 跳过特殊文件
            if (shouldSkipFile(document.fileName)) {
                logger.info(
                    `Skipping open diagnosis for: ${document.fileName} (special file)`,
                );
                return;
            }
            const diagnostics = await diagnoseDocument(document);
            diagnosticCollection.set(document.uri, diagnostics);
        },
    );

    // 监听文档内容变化时进行诊断（防抖）
    logger.info("Registering document change listener");
    const changeListener = vscode.workspace.onDidChangeTextDocument(
        async (event) => {
            // @todo暂时先不实现debounceDiagnose, 编辑时在保存之前文件内容是不会发生变化的, 需要使用stdin的方式进行校验
            logger.info(`Document change event happened! event:${event}`);
            return;
            // 只处理 shell 语言文件
            // if (event.document.languageId !== PackageInfo.languageId) {
            //     return;
            // }
            // // 跳过特殊文件
            // if (shouldSkipFile(event.document.fileName)) {
            //     logger.info(
            //         `Skipping change diagnosis for: ${event.document.fileName} (special file)`,
            //     );
            //     return;
            // }
            // logger.info(
            //     `Document change happened, trigger debounceDiagnose for: ${event.document.fileName}`,
            // );
            // debounceDiagnose(event.document, diagnosticCollection);
        },
    );

    // 监听配置变化
    // 监听配置变化时重新诊断所有 shell 脚本
    // onDidChangeConfiguration会监听配置变化, 包括用户settings.json或工作区.vscode/settings.json所有配置变化
    logger.info("Registering configuration change listener");
    const configChangeListener = vscode.workspace.onDidChangeConfiguration(
        async (event) => {
            logger.info(`Configuration change event happened! event:${event}`);

            // 检查扩展相关配置是否变化
            if (SettingInfo.isConfigurationChanged(event)) {
                logger.info("Extension relevant configuration changed");

                // 步骤 1: 刷新 SettingInfo 的配置缓存
                // 这是核心：所有配置缓存在 SettingInfo 中统一管理
                SettingInfo.refreshCache();

                // 步骤 2: 检查是否需要重新诊断
                if (SettingInfo.isDiagnosticConfigChanged(event)) {
                    logger.info(
                        "Diagnostic relevant configuration changed, re-diagnosing all documents",
                    );

                    // 失效服务缓存
                    const serviceManager = ServiceManager.getInstance();
                    serviceManager.invalidate();

                    // 重新诊断所有文档
                    const results = await diagnoseAllShellScripts();
                    results.forEach((diagnostics, uri) => {
                        diagnosticCollection.set(uri, diagnostics);
                    });
                }

                logger.info("Configuration change handled successfully");
            }
        },
    );

    // 安装插件后, 异步诊断所有打开的 shell 脚本
    // 这是为了确保用户在安装插件后, 能够立即看到所有 shell 脚本的诊断结果
    // 注意：不等待结果，避免阻塞 activate 函数
    logger.info("Starting background diagnosis for all open shell scripts");
    diagnoseAllShellScripts()
        .then((results) => {
            results.forEach((diagnostics, uri) => {
                diagnosticCollection.set(uri, diagnostics);
            });
            logger.info("Background diagnosis completed");
        })
        .catch((error) => {
            logger.error(`Background diagnosis failed: ${String(error)}`);
        });

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
    context.subscriptions.push(
        // formatProvider,
        rangeFormatProvider,
        codeActionProvider,
        ...commands,
        saveListener,
        openListener,
        changeListener,
        configChangeListener,
        diagnosticCollection,
    );
}

/**
 *
 * 防抖（Debounce）诊断
 * 用于延迟执行文档诊断，避免在用户快速输入时频繁触发诊断操作
 * 在事件被连续触发时，只在最后一次触发后的指定时间间隔结束后才执行回调函数。
 * 用户输入:  A    B  C   D
 *   时间轴: |----|--|---|---------> 500ms
 *   诊断触发:                       ✓ (只在D之后500ms触发一次)
 *
 * @param document 文档对象
 * @param diagnosticCollection VSCode 诊断集合
 * @param delay 延迟时间（毫秒）
 */
function debounceDiagnose(
    document: vscode.TextDocument,
    diagnosticCollection: vscode.DiagnosticCollection,
    delay: number = 300,
): void {
    const uri = document.uri.toString();
    logger.info(`Debouncing diagnose for: ${document.fileName}`);

    // 清除该文档之前的定时器
    const existingTimer = debounceTimers.get(uri);
    if (existingTimer) {
        clearTimeout(existingTimer);
    }

    // 设置新的定时器
    const timer = setTimeout(async () => {
        const diagnostics = await diagnoseDocument(document);
        diagnosticCollection.set(document.uri, diagnostics);
        // 清除定时器引用
        debounceTimers.delete(uri);
    }, delay);

    debounceTimers.set(uri, timer);
}

/**
 * 扩展停用函数
 *
 * 清理说明：
 * - context.subscriptions 中的资源由 VSCode 自动清理
 * - debounceTimers 需要手动清理
 * - logger 需要手动清理
 */
export function deactivate() {
    logger.info("Extension is now deactivated");

    // 清理所有防抖定时器
    for (const [uri, timer] of debounceTimers) {
        clearTimeout(timer);
        logger.info(`Debounce timer cleared for: ${uri}`);
    }
    debounceTimers.clear();

    // 清理日志输出通道
    // logger转换为LoggerAdapter
    if (logger instanceof LoggerAdapter) {
        logger.dispose();
    }
}
