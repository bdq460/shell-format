/**
 * 插件参数定义
 *
 * 为每个插件定义完整的参数接口
 * 支持工具特定参数和通用参数
 */

import { CancellationToken } from "../tools/executor/types";

// ==================== 通用参数接口 ====================

/**
 * 通用格式化选项
 */
export interface CommonFormatOptions {
    /** 取消令牌 */
    token?: CancellationToken;
    /** 超时时间（毫秒） */
    timeout?: number;
}

/**
 * 通用检查选项
 */
export interface CommonCheckOptions {
    /** 取消令牌 */
    token?: CancellationToken;
    /** 超时时间（毫秒） */
    timeout?: number;
}

// ==================== shfmt 参数接口 ====================

/**
 * shfmt 格式化选项
 */
export interface ShfmtFormatOptions extends CommonFormatOptions {
    /** 缩进大小（空格数），0 表示使用 tab */
    indent?: number;
    /** 一元运算符换行 */
    binaryNextLine?: boolean;
    /** case 语句缩进 */
    caseIndent?: boolean;
    /** 重定向操作符后加空格 */
    spaceRedirects?: boolean;
}

/**
 * shfmt 检查选项
 */
export interface ShfmtCheckOptions extends CommonCheckOptions {
    /** 缩进大小（空格数），0 表示使用 tab */
    indent?: number;
    /** 一元运算符换行 */
    binaryNextLine?: boolean;
    /** case 语句缩进 */
    caseIndent?: boolean;
    /** 重定向操作符后加空格 */
    spaceRedirects?: boolean;
}

// ==================== shellcheck 参数接口 ====================

/**
 * shellcheck 检查选项
 */
export interface ShellcheckCheckOptions extends CommonCheckOptions {
    /** 排除的规则列表（规则代码，如 SC2034） */
    excludeRules?: string[];
    /** 最低严重级别 */
    severity?: "error" | "warning" | "info" | "style";
}

/**
 * shellcheck 格式化选项（不支持格式化，但接口要求）
 */
export interface ShellcheckFormatOptions extends CommonFormatOptions {
    // shellcheck 不支持格式化，因此没有额外参数
}

// ==================== 导出 ====================

/**
 * 插件参数命名空间
 * 便于按工具分组和管理参数接口
 */
export namespace PluginParameters {
    export namespace Shfmt {
        export type FormatOptions = ShfmtFormatOptions;
        export type CheckOptions = ShfmtCheckOptions;
    }

    export namespace Shellcheck {
        export type FormatOptions = ShellcheckFormatOptions;
        export type CheckOptions = ShellcheckCheckOptions;
    }
}
