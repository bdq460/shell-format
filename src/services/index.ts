/**
 * 服务层
 * 管理工具实例和配置，为业务层提供配置好的工具接口
 *
 * 架构优化：
 * 1. 使用 ServiceManager 单例管理服务实例
 * 2. 实现配置快照机制，自动检测配置变化
 * 3. 提供 invalidate() 方法，配置变化时失效缓存
 */

import { ServiceManager } from "./serviceManager";

// 导出 ServiceManager（推荐使用）
export { ServiceManager };
