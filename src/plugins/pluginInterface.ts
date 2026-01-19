/**
 * 插件接口定义
 *
 * 定义格式化工具和检查工具的插件接口
 * 支持动态加载和扩展不同的格式化工具
 */

import { Diagnostic, TextDocument, TextEdit } from "vscode";
import { CancellationToken } from "../tools/executor/types";

/**
 * 通用格式化选项
 */
export interface CommondOptions {
    /** 取消令牌 */
    token?: CancellationToken;
    /** 超时时间（毫秒） */
    timeout?: number;
}

/**
 * 通用格式化选项（兼容性别名）
 * 使用插件特定的参数接口
 */
export interface FormatOptions extends CommondOptions {
    /** 检查模式（格式检查或静态分析） */
    mode?: "format" | "lint";
}

/**
 * 通用检查选项（兼容性别名）
 * 使用插件特定的参数接口
 */
export interface CheckOptions extends CommondOptions {
    /** 检查模式（格式检查或静态分析） */
    mode?: "format" | "lint";
}

/**
 * 检查结果
 */
export interface CheckResult {
    /** 是否有错误 */
    hasErrors: boolean;
    /** 诊断信息 */
    diagnostics: Diagnostic[];
    /** 错误信息（如果有） */
    errorMessage?: string;
}

export interface FormatResult {
    /** 是否有错误 */
    hasErrors: boolean;
    /** 诊断信息 */
    diagnostics: Diagnostic[];
    /** 错误信息（如果有） */
    errorMessage?: string;
    /** 格式化编辑列表, 如果为空, 表示没有格式变化 */
    textEdits: TextEdit[];
}

/**
 * 格式化和检查插件接口
 */
export interface IFormatPlugin {
    /**
     * 插件名称（唯一标识符）
     */
    name: string;

    /**
     * 插件显示名称
     */
    displayName: string;

    /**
     * 插件版本
     */
    version: string;

    /**
     * 插件描述
     */
    description: string;

    /**
     * 检查插件是否可用
     * @returns 是否可用
     */
    isAvailable(): Promise<boolean>;

    /**
     * 格式化内容
     * @param document 文档对象
     * @param options 格式化选项
     * @returns 格式化后的 TextEdit 数组
     */
    format?(
        document: TextDocument,
        options: FormatOptions,
    ): Promise<FormatResult>;

    /**
     * 检查内容
     * @param document 文档对象
     * @param options 检查选项
     * @returns 检查结果
     */
    check(document: TextDocument, options: CheckOptions): Promise<CheckResult>;

    /**
     * 获取插件支持的文件扩展名
     * @returns 文件扩展名数组（如 ['.sh', '.bash']）
     */
    getSupportedExtensions(): string[];
}
