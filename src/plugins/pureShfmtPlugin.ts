/**
 * shfmt 纯插件实现
 *
 * 直接使用 ShfmtTool，不依赖 Service 层
 * 实现统一的插件接口
 */

import * as vscode from "vscode";
import { DiagnosticAdapter } from "../adapters/diagnosticAdapter";
import { FormatterAdapter } from "../adapters/formatterAdapter";
import { SettingInfo } from "../config";
import { PackageInfo } from "../config/packageInfo";
import { PERFORMANCE_METRICS } from "../metrics";
import { ShfmtFormatOptions, ShfmtTool } from "../tools/shell/shfmt/shfmtTool";
import { logger } from "../utils/log";
import { startTimer } from "../utils/performance/monitor";
import { BaseFormatPlugin } from "./baseFormatPlugin";
import {
    CheckOptions,
    CheckResult,
    FormatOptions,
    FormatResult,
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
        options: FormatOptions,
    ): Promise<FormatResult> {
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
                PackageInfo.diagnosticSource,
                FormatterAdapter.convert,
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
        options: CheckOptions,
    ): Promise<CheckResult> {
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
                PackageInfo.diagnosticSource,
                DiagnosticAdapter.convert,
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
}
