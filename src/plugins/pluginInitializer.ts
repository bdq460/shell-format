/**
 * 插件初始化器
 *
 * 初始化并注册所有纯插件到 PluginManager
 * 从配置读取插件参数并创建插件实例
 */

import { SettingInfo } from "../config/settingInfo";
import { logger } from "../utils/log";
import { getPluginManager } from "./pluginManager";
import { PureShellcheckPlugin } from "./pureShellcheckPlugin";
import { PureShfmtPlugin } from "./pureShfmtPlugin";

/**
 * 初始化所有插件
 */
export function initializePlugins(): void {
    const pluginManager = getPluginManager();

    // 获取配置
    const shfmtPath = SettingInfo.getShfmtPath();
    const shellcheckPath = SettingInfo.getShellcheckPath();
    const indent = SettingInfo.getRealTabSize();

    // 注册 shfmt 插件
    logger.info("Initializing ShfmtPlugin...");
    const shfmtPlugin = new PureShfmtPlugin(shfmtPath, indent);
    pluginManager.register(shfmtPlugin);

    // 注册 shellcheck 插件
    logger.info("Initializing ShellcheckPlugin...");
    const shellcheckPlugin = new PureShellcheckPlugin(shellcheckPath);
    pluginManager.register(shellcheckPlugin);

    logger.info("All plugins initialized and registered");
}

/**
 * 激活可用插件（基于配置）
 * 只激活用户启用的插件
 */
export async function activatePlugins(): Promise<void> {
    const pluginManager = getPluginManager();

    // 获取插件启用状态配置
    const shfmtEnabled = SettingInfo.isShfmtEnabled();
    const shellcheckEnabled = SettingInfo.isShellcheckEnabled();

    logger.info(
        `Plugin configuration: shfmt=${shfmtEnabled}, shellcheck=${shellcheckEnabled}`,
    );

    // 构建需要激活的插件列表
    const pluginsToActivate: string[] = [];
    if (shfmtEnabled) {
        pluginsToActivate.push("shfmt");
    }
    if (shellcheckEnabled) {
        pluginsToActivate.push("shellcheck");
    }

    if (pluginsToActivate.length === 0) {
        logger.warn("No plugins are enabled in configuration");
        return;
    }

    logger.info(`Activating ${pluginsToActivate.length} enabled plugins...`);

    const successCount = await pluginManager.activateMultiple(pluginsToActivate);

    logger.info(
        `Activated ${successCount}/${pluginsToActivate.length} plugins successfully`,
    );

    // 打印插件状态
    const stats = pluginManager.getStats();
    logger.info(`Plugin stats: ${stats.total} total, ${stats.active} active`);
}
