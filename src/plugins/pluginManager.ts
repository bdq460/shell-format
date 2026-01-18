/**
 * 插件管理器
 *
 * 管理格式化和检查插件的注册、加载和调用
 * 支持动态加载和插件生命周期管理
 */

import * as vscode from "vscode";
import { PERFORMANCE_METRICS } from "../metrics";
import { logger, startTimer } from "../utils";
import {
    CheckOptions,
    CheckResult,
    FormatOptions,
    IFormatPlugin,
} from "./pluginInterface";

/**
 * 插件管理器
 */
export class PluginManager {
    private plugins = new Map<string, IFormatPlugin>();
    private activePlugins = new Set<string>();

    /**
     * 注册插件
     * @param plugin 插件实例
     */
    register(plugin: IFormatPlugin): void {
        const existingPlugin = this.plugins.get(plugin.name);

        if (existingPlugin) {
            logger.warn(
                `Plugin "${plugin.name}" is already registered, will be overwritten`,
            );
        }

        this.plugins.set(plugin.name, plugin);
        logger.info(
            `Registered plugin: ${plugin.name} v${plugin.version} (${plugin.displayName})`,
        );
        logger.debug(
            `Total plugins registered: ${this.plugins.size}, Active plugins: ${this.activePlugins.size}`,
        );
    }

    /**
     * 注销插件
     * @param name 插件名称
     */
    unregister(name: string): void {
        const plugin = this.plugins.get(name);

        if (!plugin) {
            logger.warn(`Plugin "${name}" is not registered`);
            return;
        }

        this.plugins.delete(name);
        this.activePlugins.delete(name);
        logger.info(`Unregistered plugin: ${name}`);
        logger.debug(
            `Total plugins registered: ${this.plugins.size}, Active plugins: ${this.activePlugins.size}`,
        );
    }

    /**
     * 获取插件
     * @param name 插件名称
     * @returns 插件实例，如果不存在则返回 undefined
     */
    get(name: string): IFormatPlugin | undefined {
        return this.plugins.get(name);
    }

    /**
     * 检查插件是否已注册
     * @param name 插件名称
     * @returns 是否已注册
     */
    has(name: string): boolean {
        return this.plugins.has(name);
    }

    /**
     * 获取所有已注册的插件
     * @returns 插件实例数组
     */
    getAll(): IFormatPlugin[] {
        return Array.from(this.plugins.values());
    }

    /**
     * 获取可用的插件
     * @returns 可用的插件数组
     */
    async getAvailablePlugins(): Promise<IFormatPlugin[]> {
        const timer = startTimer(PERFORMANCE_METRICS.PLUGIN_LOAD_DURATION);
        logger.info(`Checking availability of ${this.plugins.size} plugins`);

        const plugins = Array.from(this.plugins.values());
        const availablePlugins: IFormatPlugin[] = [];
        const errors: string[] = [];

        await Promise.all(
            plugins.map(async (plugin) => {
                try {
                    logger.debug(`Checking plugin: ${plugin.name}`);
                    const isAvailable = await plugin.isAvailable();
                    if (isAvailable) {
                        availablePlugins.push(plugin);
                        logger.debug(`Plugin "${plugin.name}" is available`);
                    } else {
                        logger.warn(`Plugin "${plugin.name}" is not available`);
                    }
                } catch (error) {
                    const msg = `Error checking availability of plugin "${plugin.name}": ${String(error)}`;
                    logger.error(msg);
                    errors.push(msg);
                }
            }),
        );

        timer.stop();
        logger.info(
            `Available plugins: ${availablePlugins.length}/${plugins.length}`,
        );
        if (errors.length > 0) {
            logger.warn(`Plugin availability errors: \n${errors.join("\n")}`);
        }
        return availablePlugins;
    }

    /**
     * 使用所有活动插件格式化文档
     * @param document 文档对象
     * @param options 格式化选项
     * @returns 格式化结果（第一个成功的结果）
     */
    async format(
        document: vscode.TextDocument,
        options: FormatOptions,
    ): Promise<vscode.TextEdit[]> {
        const timer = startTimer(
            PERFORMANCE_METRICS.PLUGIN_EXECUTE_FORMAT_DURATION,
        );
        logger.info(
            `Formatting document: ${document.fileName} with ${this.activePlugins.size} active plugins`,
        );

        if (this.activePlugins.size === 0) {
            logger.warn("No active plugins available for formatting");
            timer.stop();
            return [];
        }

        const errors: string[] = [];
        for (const name of this.activePlugins) {
            const plugin = this.plugins.get(name);

            if (plugin) {
                try {
                    logger.debug(`Attempting to format with plugin: ${name}`);
                    const edits = await plugin.format(document, options);

                    if (edits && edits.length > 0) {
                        timer.stop();
                        logger.info(
                            `Successfully formatted with plugin: ${name} (${edits.length} edits)`,
                        );
                        return edits;
                    } else {
                        logger.debug(
                            `Plugin "${name}" returned no edits, trying next plugin`,
                        );
                    }
                } catch (error) {
                    const msg = `Plugin "${name}" format failed: ${String(error)}, trying next plugin`;
                    logger.error(msg);
                    errors.push(msg);
                }
            }
        }

        timer.stop();
        if (errors.length > 0) {
            logger.warn(`Format errors: \n${errors.join("\n")}`);
        }
        logger.warn(
            `No active plugin successfully formatted the document: ${document.fileName}`,
        );
        return [];
    }

    /**
     * 使用所有活动插件检查文档
     * @param document 文档对象
     * @param options 检查选项
     * @returns 所有插件的诊断结果合并
     */
    async check(
        document: vscode.TextDocument,
        options: CheckOptions,
    ): Promise<CheckResult> {
        const timer = startTimer(PERFORMANCE_METRICS.PLUGIN_EXECUTE_CHECK_DURATION);
        logger.info(
            `Checking document: ${document.fileName} with ${this.activePlugins.size} active plugins`,
        );

        if (this.activePlugins.size === 0) {
            logger.warn("No active plugins available for checking");
            timer.stop();
            return {
                hasErrors: false,
                diagnostics: [],
            };
        }

        const allDiagnostics: vscode.Diagnostic[] = [];
        let hasErrors = false;
        const errors: string[] = [];

        for (const name of this.activePlugins) {
            const plugin = this.plugins.get(name);

            if (plugin) {
                try {
                    logger.debug(`Checking with plugin: ${name}`);
                    const result = await plugin.check(document, options);

                    if (result.diagnostics) {
                        allDiagnostics.push(...result.diagnostics);
                        logger.debug(
                            `Plugin "${name}" returned ${result.diagnostics.length} diagnostics`,
                        );
                    }

                    if (result.hasErrors) {
                        hasErrors = true;
                    }

                    if (result.errorMessage) {
                        logger.error(
                            `Plugin "${name}" check error: ${result.errorMessage}`,
                        );
                    }
                } catch (error) {
                    const msg = `Plugin "${name}" check failed: ${String(error)}`;
                    logger.error(msg);
                    errors.push(msg);
                    hasErrors = true;
                }
            }
        }

        timer.stop();
        if (errors.length > 0) {
            logger.warn(`Check errors: \n${errors.join("\n")}`);
        }
        logger.info(
            `Checking completed: ${allDiagnostics.length} total diagnostics from ${this.activePlugins.size} plugins`,
        );

        return {
            hasErrors,
            diagnostics: allDiagnostics,
        };
    }

    /**
     * 清除所有插件
     */
    clear(): void {
        this.plugins.clear();
        this.activePlugins.clear();
        logger.info("Cleared all plugins");
    }

    /**
     * 停用所有插件
     */
    deactivateAll(): void {
        const count = this.activePlugins.size;
        this.activePlugins.clear();
        logger.info(`Deactivated all ${count} plugins`);
    }

    /**
     * 重新激活插件（先停用所有，再激活指定插件）
     * @param names 插件名称数组
     * @returns 成功激活的插件数量
     */
    async reactivate(names: string[]): Promise<number> {
        logger.info("Reactivating plugins: deactivate all then activate selected");
        this.deactivateAll();
        return this.activateMultiple(names);
    }

    /**
     * 批量激活插件（并行执行以提升性能）
     * @param names 插件名称数组
     * @returns 成功激活的插件数量
     */
    async activateMultiple(names: string[]): Promise<number> {
        const timer = startTimer(PERFORMANCE_METRICS.PLUGIN_LOAD_DURATION);
        logger.info(`Activating ${names.length} plugins`);

        const activationResults = await Promise.all(
            names.map(async (name) => {
                const success = await this.activate(name);
                return { name, success };
            }),
        );

        const successCount = activationResults.filter((r) => r.success).length;
        const failedPlugins = activationResults
            .filter((r) => !r.success)
            .map((r) => r.name);

        timer.stop();
        if (failedPlugins.length > 0) {
            logger.warn(
                `Plugin activation completed: ${successCount}/${names.length} successful (failed: ${failedPlugins.join(", ")})`,
            );
        } else {
            logger.info(
                `Plugin activation completed: ${successCount}/${names.length} successful`,
            );
        }

        return successCount;
    }

    /**
     * 激活插件
     * @param name 插件名称
     * @returns 是否激活成功
     */
    async activate(name: string): Promise<boolean> {
        const plugin = this.plugins.get(name);
        if (!plugin) {
            logger.error(`Plugin "${name}" is not registered`);
            return false;
        }
        const isAvailable = await plugin.isAvailable();
        if (!isAvailable) {
            logger.warn(`Plugin "${name}" is not available`);
            return false;
        }
        this.activePlugins.add(name);
        logger.info(`Activated plugin: ${name}`);
        return true;
    }

    /**
     * 检查插件是否处于活动状态
     * @param name 插件名称
     * @returns 是否活动
     */
    isActive(name: string): boolean {
        return this.activePlugins.has(name);
    }

    /**
     * 获取所有活动插件的名称
     * @returns 活动插件名称数组
     */
    getActivePluginNames(): string[] {
        return Array.from(this.activePlugins);
    }

    /**
     * 获取插件统计信息
     * @returns 插件统计信息
     */
    getStats(): {
        total: number;
        active: number;
        plugins: Array<{
            name: string;
            displayName: string;
            version: string;
            active: boolean;
        }>;
    } {
        const plugins = Array.from(this.plugins.values()).map((plugin) => ({
            name: plugin.name,
            displayName: plugin.displayName,
            version: plugin.version,
            active: this.activePlugins.has(plugin.name),
        }));

        return {
            total: plugins.length,
            active: this.activePlugins.size,
            plugins,
        };
    }
}

/**
 * 全局插件管理器实例
 */
let globalPluginManager: PluginManager | null = null;

/**
 * 获取全局插件管理器实例
 * @returns 插件管理器实例
 */
export function getPluginManager(): PluginManager {
    if (!globalPluginManager) {
        globalPluginManager = new PluginManager();
        logger.info("Global plugin manager initialized");
    }
    return globalPluginManager;
}

/**
 * 设置全局插件管理器实例（主要用于测试）
 * @param manager 插件管理器实例
 */
export function setPluginManager(manager: PluginManager): void {
    globalPluginManager = manager;
}

/**
 * 重置全局插件管理器（主要用于测试）
 */
export function resetPluginManager(): void {
    if (globalPluginManager) {
        globalPluginManager.clear();
    }
}
