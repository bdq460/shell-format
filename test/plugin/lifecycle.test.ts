/**
 * 插件生命周期钩子测试示例
 *
 * 这个文件展示了如何测试插件的生命周期钩子
 */

import assert from "assert";
import * as vscode from "vscode";
import { BaseFormatPlugin } from "../../src/plugins/baseFormatPlugin";
import { PluginManager } from "../../src/plugins/pluginManager";

/**
 * 测试插件实现
 */
class TestPlugin extends BaseFormatPlugin {
    name = "test-plugin";
    displayName = "Test Plugin";
    version = "1.0.0";
    description = "Plugin for testing lifecycle hooks";

    onActivateCalled = false;
    onDeactivateCalled = false;
    onConfigChangeCalled = false;
    lastConfig: any = null;

    public watcher?: vscode.FileSystemWatcher;

    getDiagnosticSource(): string {
        return "test";
    }

    async isAvailable(): Promise<boolean> {
        return true;
    }

    async check(_document: any, _options: any): Promise<any> {
        return {
            hasErrors: false,
            diagnostics: [],
        };
    }

    getSupportedExtensions(): string[] {
        return [".test"];
    }

    async onActivate(): Promise<void> {
        this.onActivateCalled = true;
        console.log("TestPlugin activated");

        // 模拟创建资源
        this.watcher = {
            dispose: () => {
                console.log("TestPlugin watcher disposed");
            },
        } as any;
    }

    async onDeactivate(): Promise<void> {
        this.onDeactivateCalled = true;
        console.log("TestPlugin deactivated");

        // 清理资源
        if (this.watcher) {
            this.watcher.dispose();
            this.watcher = undefined;
        }
    }

    async onConfigChange(config: any): Promise<void> {
        this.onConfigChangeCalled = true;
        this.lastConfig = config;
        console.log("TestPlugin config changed:", config);
    }
}

/**
 * 测试函数
 */
async function testLifecycleHooks() {
    console.log("=== 测试插件生命周期钩子 ===\n");

    // 创建插件管理器
    const pluginManager = new PluginManager();

    // 创建测试插件
    const plugin = new TestPlugin();

    // 1. 测试注册
    console.log("1. 测试注册插件");
    pluginManager.register(plugin);
    assert(pluginManager.has("test-plugin"), "插件应该被注册");
    assert(!pluginManager.isActive("test-plugin"), "插件应该是未激活状态");
    assert(!plugin.onActivateCalled, "onActivate 不应该被调用");
    console.log("✓ 注册成功，onActivate 未被调用\n");

    // 2. 测试激活
    console.log("2. 测试激活插件");
    await pluginManager.activate("test-plugin");
    assert(pluginManager.isActive("test-plugin"), "插件应该是已激活状态");
    assert(plugin.onActivateCalled, "onActivate 应该被调用");
    assert(plugin.watcher !== undefined, "资源应该被初始化");
    console.log("✓ 激活成功，onActivate 被调用，资源已初始化\n");

    // 3. 测试配置变更
    console.log("3. 测试配置变更");
    const testConfig = { indent: 4, strict: true };
    await pluginManager.notifyConfigChange(testConfig);
    assert(plugin.onConfigChangeCalled, "onConfigChange 应该被调用");
    assert.deepStrictEqual(plugin.lastConfig, testConfig, "配置应该正确传递");
    console.log("✓ 配置变更成功，onConfigChange 被调用\n");

    // 4. 测试重新激活
    console.log("4. 测试重新激活插件");
    plugin.onActivateCalled = false;
    plugin.onDeactivateCalled = false;
    await pluginManager.reactivate(["test-plugin"]);
    assert(plugin.onDeactivateCalled, "重新激活前应该先调用 onDeactivate");
    assert(plugin.onActivateCalled, "重新激活后应该调用 onActivate");
    assert(plugin.watcher !== undefined, "资源应该被重新初始化");
    console.log("✓ 重新激活成功，onDeactivate 和 onActivate 依次被调用\n");

    // 5. 测试停用所有
    console.log("5. 测试停用所有插件");
    await pluginManager.deactivateAll();
    assert(!pluginManager.isActive("test-plugin"), "插件应该是未激活状态");
    assert(plugin.onDeactivateCalled, "onDeactivate 应该被调用");
    assert(plugin.watcher === undefined, "资源应该被清理");
    console.log("✓ 停用成功，onDeactivate 被调用，资源已清理\n");

    // 6. 测试注销
    console.log("6. 测试注销插件");
    plugin.onActivateCalled = false;
    plugin.onDeactivateCalled = false;
    plugin.watcher = { dispose: () => { } } as any;

    pluginManager.register(plugin);
    await pluginManager.activate("test-plugin");
    assert(plugin.watcher !== undefined, "资源应该存在");

    await pluginManager.unregister("test-plugin");
    assert(!pluginManager.has("test-plugin"), "插件应该被注销");
    assert(plugin.onDeactivateCalled, "注销时应该调用 onDeactivate");
    assert(plugin.watcher === undefined, "资源应该被清理");
    console.log("✓ 注销成功，onDeactivate 被调用，资源已清理\n");

    // 7. 测试多个插件
    console.log("7. 测试多个插件的钩子");
    const plugin2 = new TestPlugin();
    plugin2.name = "test-plugin-2";
    plugin2.displayName = "Test Plugin 2";

    pluginManager.register(plugin);
    pluginManager.register(plugin2);

    await pluginManager.activateMultiple(["test-plugin", "test-plugin-2"]);
    assert(plugin.onActivateCalled, "插件1 的 onActivate 应该被调用");
    assert(plugin2.onActivateCalled, "插件2 的 onActivate 应该被调用");
    console.log("✓ 多个插件激活成功，所有 onActivate 被调用\n");

    // 8. 测试配置变更通知所有插件
    console.log("8. 测试配置变更通知所有插件");
    plugin.onConfigChangeCalled = false;
    plugin2.onConfigChangeCalled = false;

    await pluginManager.notifyConfigChange({ indent: 2 });
    assert(plugin.onConfigChangeCalled, "插件1 的 onConfigChange 应该被调用");
    assert(plugin2.onConfigChangeCalled, "插件2 的 onConfigChange 应该被调用");
    console.log("✓ 配置变更通知成功，所有插件的 onConfigChange 被调用\n");

    console.log("=== 所有测试通过！ ===");
}

/**
 * 运行测试
 */
async function runTests() {
    try {
        await testLifecycleHooks();
        console.log("\n✅ 生命周期钩子测试全部通过");
        process.exit(0);
    } catch (error) {
        console.error("\n❌ 测试失败:", error);
        process.exit(1);
    }
}

// 如果直接运行此文件，执行测试
if (require.main === module) {
    runTests();
}

export { testLifecycleHooks, TestPlugin };
