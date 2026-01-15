/**
 * 插件默认配置信息工具类
 * 统一管理从 package.json 读取的默认配置值
 */

import * as vscode from 'vscode';
import { PackageInfo } from './packageInfo';

/**
 * 默认配置信息类
 * 统一管理从 package.json 的 contributes.configuration.properties 读取的默认配置
 */

/**
 * 配置管理工具
 *
 * 提供对 VSCode 工作区配置的统一访问接口，支持：
 * - shfmt 可执行文件路径配置
 * - shfmt 参数配置（支持字符串和数组两种格式）
 * - tab 缩进配置（数字空格或 tab 字符）
 * - 错误处理方式配置
 * - 配置变更检测
 *
 * 优先使用用户配置，若用户未配置则使用 package.json 中定义的默认值
 */
export class SettingInfo {

    // 缓存配置对象，避免重复调用 getConfiguration
    private static configSection: string = PackageInfo.extensionName;

    /**
     * 获取配置对象
     * @param section 配置节，默认为扩展名称
     * @returns VSCode 配置对象
     */
    private static getConfig(section?: string): vscode.WorkspaceConfiguration {
        return vscode.workspace.getConfiguration(section || this.configSection);
    }

    // ==================== shellcheck 路径配置 ====================
    static getShellcheckPath(): string {
        const config = this.getConfig();
        return config.get<string>('shellcheck', PackageInfo.defaultShellCheckPath);
    }

    // ==================== shfmt 路径配置 ====================

    /**
     * 获取 shfmt 可执行文件路径
     * @returns shfmt 可执行文件的路径，优先使用用户配置，否则使用默认值 'shfmt'
     */
    static getShfmtPath(): string {
        const config = this.getConfig();
        return config.get<string>('shfmtPath', PackageInfo.defaultShfmtPath);
    }

    // ==================== log 配置 ====================
    static getLogOutput(): string | undefined {
        const config = this.getConfig();
        return config.get<string>('logOutput', PackageInfo.defaultLogOutput);
    }

    // ==================== tabSize 配置 ====================

    /**
     * 获取 tab 缩进配置
     * @returns tab 缩进配置：数字表示空格数，字符串 'tab' 表示使用 tab 字符
     */
    static getTabSize(): number | string {
        const config = this.getConfig();
        return config.get<number | string>('tabSize', PackageInfo.defaultTabSize);
    }


    /**
     * 获取 实际tab 缩进配置
     * @returns tab 缩进配置
     */
    static getRealTabSize(): number | undefined {
        const tabSetting = this.getTabSize();
        if (tabSetting === 'ignore') {
            return undefined;
        } else if (typeof tabSetting === 'number' && tabSetting >= 0) {
            // 使用空格缩进
            return tabSetting
        }
        // 设置为 'vscode'或其他未知值, 默认使用 vscode 缩进
        return vscode.workspace.getConfiguration('editor').get<number>('tabSize');
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
    static getOnErrorSetting(): string {
        const config = this.getConfig();
        return config.get<string>('onError', PackageInfo.defaultOnError);
    }

    // ==================== 参数构建 ====================

    /**
     * 构建 shfmt 参数列表
     *
     * 1. 不包括 '-w' 参数，因为该参数用于原地写入文件，而插件使用标准输入输出
     * 2. tab 缩进配置优先使用用户配置，否则使用默认值, 默认值为 'vscode', 即使用vscode的缩进配置
     *
     * @returns 完整的 shfmt 参数数组
     */
    static buildShfmtArgs(): string[] {

        const tabSize = this.getTabSize();
        // 如果 vscode 没有配置缩进，则使用默认值
        if (tabSize === undefined) {
            return PackageInfo.defaultShfmtArgs;
        }
        return ['-i', `${tabSize}`, ...PackageInfo.defaultShfmtArgs];
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
    static isConfigurationChanged(event: vscode.ConfigurationChangeEvent): boolean {
        // 监听本插件的配置变化
        if (event.affectsConfiguration(this.configSection)) {
            return true;
        }
        // 只有当 shellformat.tabSize 设置为 'vscode' 时，才需要监听 editor.tabSize 变化
        if (this.getTabSize() === 'vscode' && event.affectsConfiguration('editor.tabSize')) {
            return true;
        }
        return false;
    }
}
