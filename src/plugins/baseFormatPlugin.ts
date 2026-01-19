/**
 * 基础格式化插件抽象类
 *
 * 提供通用的工具方法，避免插件实现中的代码重复
 * 包括异常处理、错误诊断创建等共享逻辑
 */

import * as vscode from "vscode";
import { CheckResult, FormatResult, IFormatPlugin } from "./pluginInterface";

/**
 * 从工具结果中提取错误消息
 */
export function getErrorMessage(result: any): string | undefined {
    if (result.executeErrors && result.executeErrors.length > 0) {
        return result.executeErrors[0].message;
    }
    return undefined;
}

/**
 * 创建执行错误诊断
 */
export function createErrorDiagnostic(
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
 * 创建错误CheckResult
 */
export function createErrorCheckResult(
    document: vscode.TextDocument,
    errorMessage: string,
    source: string,
): CheckResult {
    const errorDiagnostic = createErrorDiagnostic(document, errorMessage, source);
    return {
        hasErrors: true,
        diagnostics: [errorDiagnostic],
        errorMessage,
    };
}

/**
 * 创建成功的CheckResult
 */
function createSuccessCheckResult(
    diagnostics: vscode.Diagnostic[],
    errorMessage: string | undefined,
): CheckResult {
    return {
        hasErrors: diagnostics.some(
            (diag) => diag.severity === vscode.DiagnosticSeverity.Error,
        ),
        diagnostics,
        errorMessage,
    };
}

/**
 * 创建成功的FormatResult
 */
function createSuccessFormatResult(
    textEdits: vscode.TextEdit[],
    errorMessage: string | undefined,
): FormatResult {
    return {
        hasErrors: false,
        diagnostics: [],
        errorMessage,
        textEdits,
    };
}

/**
 * 创建错误FormatResult
 */
export function createErrorFormatResult(
    document: vscode.TextDocument,
    errorMessage: string,
    source: string,
): FormatResult {
    const errorDiagnostic = createErrorDiagnostic(document, errorMessage, source);
    return {
        hasErrors: true,
        diagnostics: [errorDiagnostic],
        errorMessage,
        textEdits: [],
    };
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
    abstract check(document: any, options: any): Promise<CheckResult>;

    /**
     * 格式化文档（由子类实现，可选）
     */
    format?(document: any, options: any): Promise<FormatResult>;

    /**
     * 处理check操作的异常
     */
    protected handleCheckError(document: any, error: unknown): CheckResult {
        const errorMessage = String(error);
        return createErrorCheckResult(
            document,
            errorMessage,
            this.getDiagnosticSource(),
        );
    }

    /**
     * 处理format操作的异常
     */
    protected handleFormatError(document: any, error: unknown): FormatResult {
        const errorMessage = String(error);
        return createErrorFormatResult(
            document,
            errorMessage,
            this.getDiagnosticSource(),
        );
    }

    /**
     * 将工具结果转换为诊断信息
     * 用于check方法中处理诊断结果
     */
    protected convertToDiagnostics(
        result: any,
        document: vscode.TextDocument,
        diagnosticSource: string,
    ): vscode.Diagnostic[] {
        return Array.isArray(result) ? result : [];
    }

    /**
     * 检查诊断中是否包含错误
     */
    protected hasErrorDiagnostics(diagnostics: vscode.Diagnostic[]): boolean {
        return diagnostics.some(
            (diag) => diag.severity === vscode.DiagnosticSeverity.Error,
        );
    }

    /**
     * 处理检查结果：转换诊断信息并检查是否有错误
     * 返回 { hasErrors, diagnostics, errorMessage }
     */
    protected createCheckResult(
        checkResult: any,
        document: vscode.TextDocument,
        diagnosticSource: string,
        diagnosticConverter: (
            result: any,
            doc: vscode.TextDocument,
            source: string,
        ) => vscode.Diagnostic[],
    ): CheckResult {
        const diagnostics = diagnosticConverter(
            checkResult,
            document,
            diagnosticSource,
        );
        return createSuccessCheckResult(diagnostics, getErrorMessage(checkResult));
    }

    /**
     * 处理格式化结果：检查语法错误和内容变化
     * 返回 { hasErrors, diagnostics, errorMessage, textEdits }
     */
    protected createFormatResult(
        formatResult: any,
        document: vscode.TextDocument,
        diagnosticSource: string,
        textEditsConverter: (
            result: any,
            doc: vscode.TextDocument,
        ) => vscode.TextEdit[],
    ): FormatResult {
        // 处理执行错误
        if (formatResult.executeErrors && formatResult.executeErrors.length > 0) {
            const errorMessage = getErrorMessage(formatResult);
            return createErrorFormatResult(
                document,
                errorMessage || "Execution errors occurred during formatting",
                diagnosticSource,
            );
        }

        // 检查语法错误
        if (formatResult.syntaxErrors && formatResult.syntaxErrors.length > 0) {
            return {
                hasErrors: true,
                diagnostics: [],
                errorMessage:
                    getErrorMessage(formatResult) ||
                    `Syntax errors prevent formatting: ${formatResult.syntaxErrors.length} errors`,
                textEdits: [],
            };
        }

        // 检查格式化内容
        if (!formatResult.formattedContent) {
            return {
                hasErrors: true,
                diagnostics: [],
                errorMessage:
                    getErrorMessage(formatResult) || "No formatted content returned",
                textEdits: [],
            };
        }

        // 检查内容是否有变化
        if (formatResult.formattedContent === document.getText()) {
            return createSuccessFormatResult([], getErrorMessage(formatResult));
        }

        // 有内容变化，转换为 TextEdit 列表
        const edits = textEditsConverter(formatResult, document);
        return createSuccessFormatResult(edits, getErrorMessage(formatResult));
    }
}
