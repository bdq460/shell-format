"use strict";
/**
 * 插件信息工具类
 * 统一管理从 package.json 读取的配置信息
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.ConfigManager = exports.PackageInfo = void 0;
const vscode = __importStar(require("vscode"));
const packageJson = __importStar(require("../../package.json"));
/**
 * 插件信息类
 * 统一管理从 package.json 读取的插件元数据
 *
 * 该类提供了静态访问器来获取插件的配置信息，包括：
 * - 基本信息（名称、版本、发布者等）
 * - 语言配置（语言ID、别名、文件扩展名）
 * - 命令配置（命令ID和标题）
 * - CodeAction 配置
 * - 默认配置值
 *
 * 所有配置都直接从 package.json 读取，避免硬编码
 */
class PackageInfo {
    // ==================== 插件基本信息 ====================
    /**
     * 获取插件名称
     * @returns 插件标识符
     */
    static get extensionName() {
        return packageJson.name;
    }
    /**
     * 获取插件显示名称
     * @returns 插件在市场中显示的名称
     */
    static get displayName() {
        return packageJson.displayName;
    }
    /**
     * 获取插件描述
     * @returns 插件的功能描述
     */
    static get description() {
        return packageJson.description;
    }
    /**
     * 获取插件版本
     * @returns 插件版本号
     */
    static get version() {
        return packageJson.version;
    }
    /**
     * 获取插件发布者
     * @returns 插件发布者名称
     */
    static get publisher() {
        return packageJson.publisher;
    }
    // ==================== 语言配置 ====================
    /**
     * 获取语言ID
     * @returns shell 脚本的语言标识符，默认为 'shellscript'
     */
    static get languageId() {
        return packageJson.contributes?.languages?.[0]?.id || 'shellscript';
    }
    /**
     * 获取语言别名
     * @returns 语言的别名数组，如 ['shell', 'bash', 'sh']
     */
    static get languageAliases() {
        return packageJson.contributes?.languages?.[0]?.aliases || [];
    }
    /**
     * 获取支持的文件扩展名
     * @returns 支持的文件扩展名数组，如 ['.sh', '.bash', '.zsh']
     */
    static get fileExtensions() {
        return packageJson.contributes?.languages?.[0]?.extensions || ['.sh', '.bash', '.zsh'];
    }
    // ==================== 命令配置 ====================
    /**
     * 获取格式化文档的命令ID
     * @returns 格式化文档命令的完整ID
     */
    static get commandFormatDocument() {
        return packageJson.contributes?.commands?.find((c) => c.command?.includes('formatDocument'))?.command
            || 'shell-format.formatDocument';
    }
    /**
     * 获取修复所有问题的命令ID
     * @returns 修复所有问题命令的完整ID
     */
    static get commandFixAllProblems() {
        return packageJson.contributes?.commands?.find((c) => c.command?.includes('fixAllProblems'))?.command
            || 'shell-format.fixAllProblems';
    }
    /**
     * 获取格式化文档命令的标题
     * @returns 格式化文档命令在命令面板中显示的标题
     */
    static get commandFormatTitle() {
        return packageJson.contributes?.commands?.find((c) => c.command?.includes('formatDocument'))?.title
            || 'Format Document';
    }
    /**
     * 获取修复所有问题命令的标题
     * @returns 修复所有问题命令在命令面板中显示的标题
     */
    static get commandFixAllTitle() {
        return packageJson.contributes?.commands?.find((c) => c.command?.includes('fixAllProblems'))?.title
            || 'Fix All Problems';
    }
    // ==================== CodeAction 配置 ====================
    /**
     * 获取快速修复 CodeAction 的标题
     * @returns 快速修复操作在代码问题灯泡中显示的标题
     */
    static get codeActionQuickFixTitle() {
        return packageJson.contributes?.codeActions?.find((c) => c.kind?.includes('quickfix'))?.title
            || 'Fix this issue with shell-format';
    }
    /**
     * 获取修复所有 CodeAction 的标题
     * @returns 修复所有操作在代码问题灯泡中显示的标题
     */
    static get codeActionFixAllTitle() {
        return packageJson.contributes?.codeActions?.find((c) => c.kind?.includes('source.fixAll'))?.title
            || 'Fix all with shell-format';
    }
    // ==================== 诊断配置 ====================
    /**
     * 获取诊断源名称
     * @returns 用于标识诊断信息的来源名称
     */
    static get diagnosticSource() {
        return this.extensionName;
    }
    // ==================== 默认配置 ====================
    /**
     * 获取 shellcheck 可执行文件的默认路径
     * @returns shellcheck 可执行文件的默认路径，默认为 'shellcheck'
     */
    static get defaultShellCheckPath() {
        const configProperties = packageJson.contributes?.configuration?.properties;
        return configProperties?.[`${PackageInfo.extensionName}.shellcheckPath`]?.default
            || 'shellcheck';
    }
    // ==================== shfmt 路径配置 ====================
    /**
     * 获取 shfmt 可执行文件的默认路径
     * @returns shfmt 可执行文件的默认路径，默认为 'shfmt'
     */
    static get defaultShfmtPath() {
        const configProperties = packageJson.contributes?.configuration?.properties;
        return configProperties?.[`${PackageInfo.extensionName}.shfmtPath`]?.default
            || 'shfmt';
    }
    /**
     * 获取 shfmt 的默认参数
     * @returns shfmt 的默认参数数组，如 ['-i', '2', '-bn', '-ci', '-sr']
     */
    static get defaultShfmtArgs() {
        return ['-i', '2', '-bn', '-ci', '-sr'];
    }
    /**
     * 获取默认的日志输出
     * @returns 默认的日志输出方式，可选值为 'off' 或 'on'
     */
    static get defaultLogOutput() {
        const configProperties = packageJson.contributes?.configuration?.properties;
        return configProperties?.[`${PackageInfo.extensionName}.logOutput`]?.default
            || 'off';
    }
    /**
     * 获取默认的错误处理方式
     * @returns 默认的错误处理方式，可选值为 'showProblem' 或 'ignore'
     */
    static get defaultOnError() {
        const configProperties = packageJson.contributes?.configuration?.properties;
        return configProperties?.[`${PackageInfo.extensionName}.onError`]?.default
            || 'showProblem';
    }
}
exports.PackageInfo = PackageInfo;
/**
 * 配置管理工具
 *
 * 提供对 VSCode 工作区配置的统一访问接口，支持：
 * - shfmt 可执行文件路径配置
 * - shfmt 参数配置（支持字符串和数组两种格式）
 * - 错误处理方式配置
 * - 配置变更检测
 *
 * 优先使用用户配置，若用户未配置则使用 package.json 中定义的默认值
 */
class ConfigManager {
    /**
     * 获取配置对象
     * @param section 配置节，默认为扩展名称
     * @returns VSCode 配置对象
     */
    static getConfig(section) {
        return vscode.workspace.getConfiguration(section || this.configSection);
    }
    // ==================== shellcheck 路径配置 ====================
    static getShellcheckPath() {
        const config = this.getConfig();
        return config.get('shellcheck', PackageInfo.defaultShellCheckPath);
    }
    // ==================== shfmt 路径配置 ====================
    /**
     * 获取 shfmt 可执行文件路径
     * @returns shfmt 可执行文件的路径，优先使用用户配置，否则使用默认值 'shfmt'
     */
    static getShfmtPath() {
        const config = this.getConfig();
        return config.get('shfmtPath', PackageInfo.defaultShfmtPath);
    }
    // ==================== shfmt 参数配置 ====================
    /**
     * 获取 shfmt 参数（数组格式）
     *
     * 这是推荐的参数配置方式，参数以数组形式提供
     *
     * @returns shfmt 的参数数组，如 ["-i", "2", "-bn", "-ci", "-sr"]
     */
    static getShfmtArgs() {
        return PackageInfo.defaultShfmtArgs;
    }
    // ==================== log 配置 ====================
    static getLogOutput() {
        const config = this.getConfig();
        return config.get('logOutput', PackageInfo.defaultLogOutput);
    }
    // ==================== 错误处理配置 ====================
    /**
     * 获取错误处理方式
     *
     * 控制当格式化失败时的行为：
     * - 'showProblem': 在问题面板显示错误
     * - 'ignore': 忽略错误
     *
     * @returns 错误处理方式，默认为 'showProblem'
     */
    static getOnErrorSetting() {
        const config = this.getConfig();
        return config.get('onError', PackageInfo.defaultOnError);
    }
    // ==================== 参数构建 ====================
    /**
     * 构建 shfmt 参数列表
     *
     * 按优先级顺序组合参数：
     * 1. 优先使用字符串格式配置 (flag)
     * 2. 其次使用数组格式配置 (args)
     * 3. 最后使用默认参数
     *
     * 注意：会自动过滤掉 '-w' 参数，因为该参数用于原地写入文件，而插件使用标准输入输出
     *
     * @returns 完整的 shfmt 参数数组
     */
    static buildShfmtArgs() {
        const args = [];
        const userArgs = this.getShfmtArgs();
        if (userArgs && userArgs.length > 0) {
            // 使用数组格式的参数
            const validFlags = userArgs.filter(f => !f.includes('-w'));
            args.push(...validFlags);
        }
        else {
            // 使用默认参数
            args.push(...PackageInfo.defaultShfmtArgs);
        }
        return args;
    }
    // ==================== 配置变更检测 ====================
    /**
     * 检查配置是否影响当前扩展
     *
     * 用于配置变更事件处理，判断是否需要重新初始化插件
     *
     * @param event - VSCode 配置变更事件对象
     * @returns 如果变更影响当前扩展返回 true，否则返回 false
     */
    static isConfigurationChanged(event) {
        return event.affectsConfiguration(this.configSection);
    }
}
exports.ConfigManager = ConfigManager;
// 缓存配置对象，避免重复调用 getConfiguration
ConfigManager.configSection = PackageInfo.extensionName;
//# sourceMappingURL=extensionInfo.js.map