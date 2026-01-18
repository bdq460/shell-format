/**
 * shellcheck 纯插件实现
 *
 * 直接使用 ShellcheckTool，不依赖 Service 层
 * 实现统一的插件接口
 */

import * as vscode from "vscode";
import { DiagnosticAdapter } from "../adapters/diagnosticAdapter";
import { PackageInfo } from "../config/packageInfo";
import { ShellcheckTool } from "../tools/shell/shellcheck/shellcheckTool";
import { logger } from "../utils/log";
import {
    CheckOptions,
    CheckResult,
    FormatOptions,
    IFormatPlugin,
} from "./pluginInterface";

/**
 * shellcheck 纯插件
 * 注意：shellcheck 只提供检查功能，不提供格式化功能
 */
export class PureShellcheckPlugin implements IFormatPlugin {
    name = "shellcheck";
    displayName = "ShellCheck";
    version = "1.0.0";
    description = "Check shell scripts for common errors using shellcheck";

    private tool: ShellcheckTool;

    constructor(shellcheckPath: string) {
        this.tool = new ShellcheckTool(shellcheckPath);
        logger.info(
            `PureShellcheckPlugin initialized with path: ${shellcheckPath}`,
        );
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
     * 格式化文档
     * shellcheck 不支持格式化，返回空数组
     */
    async format(
        _document: vscode.TextDocument,
        _options: FormatOptions,
    ): Promise<vscode.TextEdit[]> {
        logger.debug("PureShellcheckPlugin.format called (not supported)");
        return [];
    }

    /**
     * 检查文档
     */
    async check(
        document: vscode.TextDocument,
        options: CheckOptions,
    ): Promise<CheckResult> {
        logger.debug(
            `PureShellcheckPlugin.check called with options: ${JSON.stringify(options)}`,
        );

        try {
            const result = await this.tool.check({
                file: "-",
                token: options.token,
                content: document.getText(),
            });

            const diagnostics = DiagnosticAdapter.convert(
                result,
                document,
                PackageInfo.diagnosticSource,
            );

            // 检查是否有错误或警告
            const hasErrors = diagnostics.some(
                (diag) => diag.severity === vscode.DiagnosticSeverity.Error,
            );

            logger.debug(
                `PureShellcheckPlugin.check returned ${diagnostics.length} diagnostics`,
            );
            return {
                hasErrors,
                diagnostics,
            };
        } catch (error) {
            logger.error(`PureShellcheckPlugin.check failed: ${String(error)}`);
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
