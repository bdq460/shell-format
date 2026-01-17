/**
 * ServiceManager - 服务单例管理器
 *
 * 功能：
 * 1. 管理服务实例的单例，避免重复创建
 * 2. 实现配置变化检测机制（基于 SettingInfo 的配置缓存）
 * 3. 提供 invalidate() 方法，配置变化时失效服务实例
 * 4. 确保配置变化的实时性：配置变化后，下一次调用使用新配置
 *
 * 配置变化检测策略：
 * - 依赖 VSCode 的 onDidChangeConfiguration 事件
 * - 配置变化时，事件处理器调用 SettingInfo.refreshCache()
 * - 配置变化后，下一次调用 getService() 时检测到配置变化并失效实例
 */

import { SettingInfo } from "../config";
import { logger } from "../utils/log";
import { ShellcheckService } from "./shellcheckService";
import { ShfmtService } from "./shfmtService";

/**
 * ServiceManager 单例类
 * 管理服务实例，提供基于 SettingInfo 缓存的配置变化检测
 */
export class ServiceManager {
    private static instance: ServiceManager | null = null;

    private shfmtService: ShfmtService | null = null;
    private shellcheckService: ShellcheckService | null = null;

    /**
     * 获取 ServiceManager 单例实例
     */
    static getInstance(): ServiceManager {
        if (!ServiceManager.instance) {
            ServiceManager.instance = new ServiceManager();
        }
        return ServiceManager.instance;
    }

    /**
     * 重置单例实例（主要用于测试）
     */
    static reset(): void {
        ServiceManager.instance = null;
    }

    /**
     * 获取 ShfmtService 实例
     *
     * 逻辑：
     * 1. 如果实例不存在，使用 SettingInfo 的配置快照创建新实例
     * 2. 配置变化时，extension.ts 调用 SettingInfo.refreshCache()
     * 3. 下次调用 getService() 时会自动使用新配置创建实例
     */
    getShfmtService(): ShfmtService {
        if (!this.shfmtService) {
            const config = SettingInfo.getConfigSnapshot();
            this.shfmtService = new ShfmtService(
                config.shfmtPath,
                SettingInfo.getRealTabSize(), // 每次都调用，处理 'vscode' 情况
            );
            logger.info(
                `Created new ShfmtService instance with config: ${JSON.stringify(config)}`,
            );
        }

        return this.shfmtService;
    }

    /**
     * 获取 ShellcheckService 实例
     *
     * 逻辑：
     * 1. 如果实例不存在，使用 SettingInfo 的配置快照创建新实例
     * 2. 配置变化时，extension.ts 调用 SettingInfo.refreshCache()
     * 3. 下次调用 getService() 时会自动使用新配置创建实例
     */
    getShellcheckService(): ShellcheckService {
        if (!this.shellcheckService) {
            const config = SettingInfo.getConfigSnapshot();
            this.shellcheckService = new ShellcheckService(config.shellcheckPath);
            logger.info(
                `Created new ShellcheckService instance with config: ${JSON.stringify(config)}`,
            );
        }

        return this.shellcheckService;
    }

    /**
     * 失效服务缓存
     *
     * 使用场景：
     * 1. 配置变化时，通过 onDidChangeConfiguration 事件调用
     * 2. 手动失效（测试场景）
     *
     * 效果：
     * - 清空所有服务实例
     * - 下一次调用 getService() 时，使用新配置创建新实例
     * - 确保配置实时生效
     *
     * 注意：配置缓存的刷新由 extension.ts 调用 SettingInfo.refreshCache() 完成
     */
    invalidate(): void {
        this.shfmtService = null;
        this.shellcheckService = null;
        logger.info("Service instances invalidated");
    }
}
