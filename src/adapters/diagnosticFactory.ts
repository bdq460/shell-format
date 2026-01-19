/**
 * 诊断工厂类
 * 统一创建各种类型的诊断对象，消除适配器间的代码重复
 */

import * as vscode from "vscode";
import {
    ExecuteError,
    FormatIssue,
    LinterIssue,
    SyntaxError,
    ToolCheckResult,
} from "../tools/shell/types";

/**
 * 诊断工厂
 * 提供统一的方式创建各种类型的诊断
 */
export class DiagnosticFactory {
    /**
     * 将工具结果转换为诊断数组
     * 统一的错误优先级：executeErrors > syntaxErrors > formatIssues > linterIssues
     * 这是 DiagnosticAdapter 和 FormatterAdapter 的共享逻辑
     * @param result 工具结果
     * @param document 文档对象
     * @param source 诊断源
     * @returns 诊断数组
     */
    static convertToolResultToDiagnostics(
        result: ToolCheckResult,
        document: vscode.TextDocument,
        source: string,
    ): vscode.Diagnostic[] {
        const diagnostics: vscode.Diagnostic[] = [];

        // 错误优先级：executeErrors > syntaxErrors > formatIssues > linterIssues
        if (result.executeErrors?.length) {
            for (const err of result.executeErrors) {
                diagnostics.push(this.createExecuteError(err, document, source));
            }
        } else if (result.syntaxErrors?.length) {
            for (const err of result.syntaxErrors) {
                diagnostics.push(this.createSyntaxError(err, document, source));
            }
        } else {
            // 格式问题和 linter 问题不作为主错误，但仍然添加到诊断中
            if (result.formatIssues) {
                for (const issue of result.formatIssues) {
                    diagnostics.push(this.createFormatIssue(issue, source));
                }
            }
            if (result.linterIssues) {
                for (const issue of result.linterIssues) {
                    diagnostics.push(this.createLinterIssue(issue, source));
                }
            }
        }

        return diagnostics;
    }

    /**
     * 创建执行错误诊断
     * 用于工具执行失败的情况
     */
    static createExecuteError(
        error: ExecuteError,
        document: vscode.TextDocument,
        source?: string,
    ): vscode.Diagnostic {
        const lineRange =
            document.lineCount > 0
                ? document.lineAt(0).range
                : new vscode.Range(0, 0, 0, 0);

        const commandName = error.command.split(" ")[0];
        const fullMessage = `${error.message}\n\nCommand: ${error.command}`;

        const diagnostic = new vscode.Diagnostic(
            lineRange,
            fullMessage,
            vscode.DiagnosticSeverity.Error,
        );
        diagnostic.source = source || commandName;
        diagnostic.code = "execution-error";
        return diagnostic;
    }

    /**
     * 创建语法错误诊断
     * 用于脚本语法错误
     */
    static createSyntaxError(
        error: SyntaxError,
        document: vscode.TextDocument,
        source: string,
    ): vscode.Diagnostic {
        const lineRange =
            document.lineCount > 0 && error.line < document.lineCount
                ? document.lineAt(error.line).range
                : new vscode.Range(0, 0, 0, 0);

        const diagnostic = new vscode.Diagnostic(
            lineRange,
            `Syntax error: ${error.message}`,
            vscode.DiagnosticSeverity.Error,
        );
        diagnostic.source = source;
        diagnostic.code = "syntax-error";
        return diagnostic;
    }

    /**
     * 创建格式问题诊断
     * 用于格式不符合预期的情况
     */
    static createFormatIssue(
        issue: FormatIssue,
        source: string,
    ): vscode.Diagnostic {
        const range = new vscode.Range(
            new vscode.Position(issue.line, issue.column),
            new vscode.Position(issue.line, issue.column + issue.rangeLength),
        );

        const diagnostic = new vscode.Diagnostic(
            range,
            issue.message || "格式不正确",
            vscode.DiagnosticSeverity.Warning,
        );
        diagnostic.source = source;
        diagnostic.code = "format-issue";
        return diagnostic;
    }

    /**
     * 创建 Linter 问题诊断
     * 用于 linter 检查出的问题
     */
    static createLinterIssue(
        issue: LinterIssue,
        source: string,
    ): vscode.Diagnostic {
        const range = new vscode.Range(
            issue.line,
            issue.column,
            issue.line,
            issue.column + 1,
        );

        const severity =
            issue.type === "error"
                ? vscode.DiagnosticSeverity.Error
                : issue.type === "warning"
                    ? vscode.DiagnosticSeverity.Warning
                    : vscode.DiagnosticSeverity.Information;

        const diagnostic = new vscode.Diagnostic(
            range,
            `${issue.code}: ${issue.message}`,
            severity,
        );
        diagnostic.source = source;
        diagnostic.code = issue.code;

        return diagnostic;
    }
}
