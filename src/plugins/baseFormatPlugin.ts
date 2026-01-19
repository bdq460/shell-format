/**
 * 基础格式化插件抽象类
 *
 * 提供通用的工具方法，避免插件实现中的代码重复
 * 包括异常处理、错误诊断创建等共享逻辑
 */

import * as vscode from "vscode";
import { DiagnosticAdapter } from "../adapters/diagnosticAdapter";
import { FormatterAdapter } from "../adapters/formatterAdapter";
import { ToolCheckResult, ToolFormatResult } from "../tools/shell/types";
import {
    IFormatPlugin,
    PluginCheckResult,
    PluginFormatResult,
} from "./pluginInterface";

/**
 * 创建执行错误诊断
 */
function createErrorDiagnostic(
    document: vscode.TextDocument,
    errorMessage: string,
    source: string,
): vscode.Diagnostic {
    const lineRange =
        document.lineCount > 0
            ? document.lineAt(0).range
            : new vscode.Range(0, 0, 0, 0);
    const errorDiagnostic = new vscode.Diagnostic(
        lineRange,
        errorMessage,
        vscode.DiagnosticSeverity.Error,
    );
    errorDiagnostic.source = source;
    errorDiagnostic.code = "execution-error";
    return errorDiagnostic;
}

/**
 * 基础格式化插件抽象类
 */
export abstract class BaseFormatPlugin implements IFormatPlugin {
    /**
     * 获取插件的诊断源名称
     */
    abstract getDiagnosticSource(): string;

    /**
     * 获取插件名称
     */
    abstract get name(): string;

    /**
     * 获取插件显示名称
     */
    abstract get displayName(): string;

    /**
     * 获取插件版本
     */
    abstract get version(): string;

    /**
     * 获取插件描述
     */
    abstract get description(): string;

    /**
     * 检查插件是否可用
     */
    abstract isAvailable(): Promise<boolean>;

    /**
     * 获取支持的文件扩展名
     */
    abstract getSupportedExtensions(): string[];

    /**
     * 检查文档（由子类实现）
     */
    abstract check(document: any, options: any): Promise<PluginCheckResult>;

    /**
     * 格式化文档（由子类实现，可选）
     */
    format?(document: any, options: any): Promise<PluginFormatResult>;

    /**
     * 处理check操作的异常
     */
    protected handleCheckError(
        document: vscode.TextDocument,
        error: unknown,
    ): PluginCheckResult {
        return {
            hasErrors: true,
            diagnostics: [
                createErrorDiagnostic(
                    document,
                    String(error),
                    this.getDiagnosticSource(),
                ),
            ],
        };
    }

    /**
     * 处理format操作的异常
     */
    protected handleFormatError(
        document: vscode.TextDocument,
        error: unknown,
    ): PluginFormatResult {
        return {
            hasErrors: true,
            diagnostics: [
                createErrorDiagnostic(
                    document,
                    String(error),
                    this.getDiagnosticSource(),
                ),
            ],
            textEdits: [],
        };
    }

    /**
     * 处理检查结果：转换诊断信息并检查是否有错误
     */
    protected createCheckResult(
        toolResult: ToolCheckResult,
        document: vscode.TextDocument,
        source: string,
    ): PluginCheckResult {
        const diagnostics = DiagnosticAdapter.convertCheckResultToDiagnostics(
            toolResult,
            document,
            source,
        );

        return {
            hasErrors: diagnostics.some(
                (diag: vscode.Diagnostic) =>
                    diag.severity === vscode.DiagnosticSeverity.Error,
            ),
            diagnostics,
        };
    }

    /**
     * 处理格式化结果：检查语法错误和内容变化
     */
    protected createFormatResult(
        toolResult: ToolFormatResult,
        document: vscode.TextDocument,
        diagnosticSource: string,
    ): PluginFormatResult {
        const { textEdits, diagnostics } =
            FormatterAdapter.convertFormatResultToDiagnosticsAndTextEdits(
                toolResult,
                document,
                diagnosticSource,
            );

        const hasErrors = diagnostics.some(
            (diag: vscode.Diagnostic) =>
                diag.severity === vscode.DiagnosticSeverity.Error,
        );

        return {
            hasErrors,
            diagnostics,
            textEdits,
        };
    }
}
