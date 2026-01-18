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
import { ShfmtFormatOptions, ShfmtTool } from "../tools/shell/shfmt/shfmtTool";
import { logger } from "../utils/log";
import {
    CheckOptions,
    CheckResult,
    FormatOptions,
    IFormatPlugin,
} from "./pluginInterface";

/**
 * shfmt 纯插件
 */
export class PureShfmtPlugin implements IFormatPlugin {
    name = "shfmt";
    displayName = "Shell Format";
    version = "1.0.0";
    description = "Format and check shell scripts using shfmt";

    private tool: ShfmtTool;
    private defaultShfmtOptions: ShfmtFormatOptions;

    constructor(shfmtPath: string, indent: number | undefined) {
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
    ): Promise<vscode.TextEdit[]> {
        logger.debug(
            `PureShfmtPlugin.format called with options: ${JSON.stringify(options)}`,
        );

        try {
            const result = await this.tool.format("-", {
                ...this.defaultShfmtOptions,
                token: options.token,
                content: document.getText(),
            });

            const edits = FormatterAdapter.convert(result, document);

            logger.debug(`PureShfmtPlugin.format returned ${edits.length} edits`);
            return edits;
        } catch (error) {
            logger.error(`PureShfmtPlugin.format failed: ${String(error)}`);
            return [];
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

        try {
            const result = await this.tool.check("-", {
                ...this.defaultShfmtOptions,
                token: options.token,
                content: document.getText(),
            });

            const diagnostics = DiagnosticAdapter.convert(
                result,
                document,
                PackageInfo.diagnosticSource,
            );

            // 检查是否有语法错误
            const hasErrors = diagnostics.some(
                (diag) => diag.severity === vscode.DiagnosticSeverity.Error,
            );

            logger.debug(
                `PureShfmtPlugin.check returned ${diagnostics.length} diagnostics`,
            );
            return {
                hasErrors,
                diagnostics,
            };
        } catch (error) {
            logger.error(`PureShfmtPlugin.check failed: ${String(error)}`);
            return {
                hasErrors: true,
                diagnostics: [],
                errorMessage: String(error),
            };
        }
    }

    /**
     * 获取支持的文件扩展名
     */
    getSupportedExtensions(): string[] {
        return PackageInfo.fileExtensions;
    }
}
