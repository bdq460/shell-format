/**
 * shfmt 纯插件实现
 *
 * 直接使用 ShfmtTool，不依赖 Service 层
 * 实现统一的插件接口
 */

import * as vscode from "vscode";
import { SettingInfo } from "../config";
import { PackageInfo } from "../config/packageInfo";
import { PERFORMANCE_METRICS } from "../metrics";
import { ShfmtFormatOptions, ShfmtTool } from "../tools/shell/shfmt/shfmtTool";
import { logger } from "../utils/log";
import { startTimer } from "../utils/performance/monitor";
import { BaseFormatPlugin } from "./baseFormatPlugin";
import {
    PluginCheckOptions,
    PluginCheckResult,
    PluginFormatOptions,
    PluginFormatResult,
} from "./pluginInterface";

/**
 * shfmt 纯插件
 */
export class PureShfmtPlugin extends BaseFormatPlugin {
    name = "shfmt";
    displayName = "Shell Format";
    version = "1.0.0";
    description = "Format and check shell scripts using shfmt";

    private tool: ShfmtTool;
    private defaultShfmtOptions: ShfmtFormatOptions;
    private watcher?: vscode.FileSystemWatcher;

    constructor(shfmtPath: string, indent: number | undefined) {
        super();
        this.tool = new ShfmtTool(shfmtPath);
        this.defaultShfmtOptions = this.buildDefaultShfmtOptions();
        logger.info(
            `PureShfmtPlugin initialized with path: ${shfmtPath}, default indent: ${indent}`,
        );
    }

    buildDefaultShfmtOptions(): ShfmtFormatOptions {
        return {
            indent: SettingInfo.getRealTabSize(),
            binaryNextLine: true,
            caseIndent: true,
            spaceRedirects: true,
        };
    }

    /**
     * 获取插件的诊断源名称
     */
    getDiagnosticSource(): string {
        return "shfmt";
    }

    /**
     * 检查 shfmt 是否可用
     */
    async isAvailable(): Promise<boolean> {
        try {
            await this.tool.check("-", {
                ...this.defaultShfmtOptions,
                content: "# test",
            });
            return true;
        } catch (error) {
            logger.warn(`shfmt is not available: ${String(error)}`);
            return false;
        }
    }

    /**
     * 格式化文档
     */
    async format(
        document: vscode.TextDocument,
        options: PluginFormatOptions,
    ): Promise<PluginFormatResult> {
        logger.debug(
            `PureShfmtPlugin.format called with options: ${JSON.stringify(options)}`,
        );

        const timer = startTimer(PERFORMANCE_METRICS.SHFMT_FORMAT_DURATION);
        try {
            const result = await this.tool.format("-", {
                ...this.defaultShfmtOptions,
                token: options.token,
                content: document.getText(),
            });

            timer.stop();
            logger.debug(`PureShfmtPlugin.format completed`);

            return this.createFormatResult(
                result,
                document,
                this.getDiagnosticSource(),
            );
        } catch (error) {
            timer.stop();
            logger.error(`PureShfmtPlugin.format failed: ${String(error)}`);
            return this.handleFormatError(document, error);
        }
    }

    /**
     * 检查文档
     */
    async check(
        document: vscode.TextDocument,
        options: PluginCheckOptions,
    ): Promise<PluginCheckResult> {
        logger.debug(
            `PureShfmtPlugin.check called with options: ${JSON.stringify(options)}`,
        );
        const timer = startTimer(PERFORMANCE_METRICS.SHFMT_DIAGNOSE_DURATION);
        try {
            const result = await this.tool.check("-", {
                ...this.defaultShfmtOptions,
                token: options.token,
                content: document.getText(),
            });

            timer.stop();
            logger.debug(`PureShfmtPlugin.check completed`);

            return this.createCheckResult(
                result,
                document,
                this.getDiagnosticSource(),
            );
        } catch (error) {
            timer.stop();
            logger.error(`PureShfmtPlugin.check failed: ${String(error)}`);
            return this.handleCheckError(document, error);
        }
    }

    /**
     * 获取支持的文件扩展名
     */
    getSupportedExtensions(): string[] {
        return PackageInfo.fileExtensions;
    }

    /**
     * 插件激活时的钩子
     * 示例：创建文件系统监视器
     */
    async onActivate(): Promise<void> {
        logger.info(`${this.name} plugin activated`);

        // 示例：创建文件监视器（如果需要监视文件变化）
        // this.watcher = vscode.workspace.createFileSystemWatcher('**/*.sh');
        // this.watcher.onDidChange((uri) => {
        //     logger.debug(`File changed: ${uri.fsPath}`);
        //     // 处理文件变化逻辑
        // });
    }

    /**
     * 插件停用时的钩子
     * 示例：清理文件系统监视器
     */
    async onDeactivate(): Promise<void> {
        logger.info(`${this.name} plugin deactivated`);

        // 清理资源
        if (this.watcher) {
            this.watcher.dispose();
            this.watcher = undefined;
        }
    }

    /**
     * 配置变更时的钩子
     * 示例：重新加载配置
     */
    async onConfigChange(config: any): Promise<void> {
        logger.info(`${this.name} config changed: ${JSON.stringify(config)}`);

        // 示例：重新加载配置
        if (config.indent !== undefined) {
            this.defaultShfmtOptions = this.buildDefaultShfmtOptions();
            logger.debug(`Reloaded default options with indent: ${this.defaultShfmtOptions.indent}`);
        }
    }
}
