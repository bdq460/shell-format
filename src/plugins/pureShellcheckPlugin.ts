/**
 * shellcheck 纯插件实现
 *
 * 直接使用 ShellcheckTool，不依赖 Service 层
 * 实现统一的插件接口
 */
import * as vscode from "vscode";
import { PackageInfo } from "../config/packageInfo";
import { PERFORMANCE_METRICS } from "../metrics";
import { ShellcheckTool } from "../tools/shell/shellcheck/shellcheckTool";
import { logger } from "../utils";
import { startTimer } from "../utils/performance/monitor";
import { BaseFormatPlugin } from "./baseFormatPlugin";
import { PluginCheckOptions, PluginCheckResult } from "./pluginInterface";

/**
 * shellcheck 纯插件
 * 注意：shellcheck 只提供检查功能，不提供格式化功能
 */
export class PureShellcheckPlugin extends BaseFormatPlugin {
    name = "shellcheck";
    displayName = "ShellCheck";
    version = "1.0.0";
    description = "Check shell scripts for common errors using shellcheck";

    private tool: ShellcheckTool;

    constructor(shellcheckPath: string) {
        super();
        this.tool = new ShellcheckTool(shellcheckPath);
        logger.info(
            `PureShellcheckPlugin initialized with path: ${shellcheckPath}`,
        );
    }

    /**
     * 获取插件的诊断源名称
     */
    getDiagnosticSource(): string {
        return "shellcheck";
    }

    /**
     * 检查 shellcheck 是否可用
     */
    async isAvailable(): Promise<boolean> {
        try {
            await this.tool.check({ file: "-", content: "# test" });
            return true;
        } catch (error) {
            logger.warn(`shellcheck is not available: ${String(error)}`);
            return false;
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
            `PureShellcheckPlugin.check called with options: ${JSON.stringify(options)}`,
        );

        const timer = startTimer(PERFORMANCE_METRICS.SHELLCHECK_DIAGNOSE_DURATION);
        try {
            const result = await this.tool.check({
                file: "-",
                token: options.token,
                content: document.getText(),
            });

            timer.stop();
            logger.debug(`PureShellcheckPlugin.check completed`);

            return this.createCheckResult(
                result,
                document,
                this.getDiagnosticSource(),
            );
        } catch (error) {
            timer.stop();
            logger.error(`PureShellcheckPlugin.check failed: ${String(error)}`);
            return this.handleCheckError(document, error);
        }
    }

    /**
     * 获取支持的文件扩展名
     */
    getSupportedExtensions(): string[] {
        return PackageInfo.fileExtensions;
    }
}
