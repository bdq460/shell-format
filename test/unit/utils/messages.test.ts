/**
 * 消息工具单元测试
 * 测试用户可见消息的各种场景
 */

import {
    ExecutionErrorMessage,
    FormatIssueMessage,
    PermissionDeniedMessage,
    ToolNotInstalledMessage
} from '#/utils/messages';
import * as assert from 'assert';

describe('Utils - Messages 模块', () => {

    describe('ToolNotInstalledMessage', () => {
        it('shellcheck 消息应包含必要信息', () => {
            const msg = ToolNotInstalledMessage.shellcheck;
            assert.ok(msg.includes('Shellcheck not installed'), '应包含 "Shellcheck not installed"');
            assert.ok(msg.includes('brew install shellcheck'), '应包含 brew 安装命令');
            assert.ok(msg.includes('https://github.com/koalaman/shellcheck'), '应包含 shellcheck GitHub 链接');
            assert.ok(msg.includes('macOS'), '应包含 macOS 提示');
            assert.ok(msg.includes('Linux'), '应包含 Linux 提示');
        });

        it('shfmt 消息应包含必要信息', () => {
            const msg = ToolNotInstalledMessage.shfmt;
            assert.ok(msg.includes('Shfmt not installed'), '应包含 "Shfmt not installed"');
            assert.ok(msg.includes('brew install shfmt'), '应包含 brew 安装命令');
            assert.ok(msg.includes('https://github.com/mvdan/sh'), '应包含 shfmt GitHub 链接');
            assert.ok(msg.includes('macOS'), '应包含 macOS 提示');
            assert.ok(msg.includes('Linux'), '应包含 Linux 提示');
        });

        it('工具未安装消息应为字符串', () => {
            assert.strictEqual(typeof ToolNotInstalledMessage.shellcheck, 'string');
            assert.strictEqual(typeof ToolNotInstalledMessage.shfmt, 'string');
        });

        it('工具未安装消息应为常量', () => {
            const original = ToolNotInstalledMessage.shellcheck;
            const msg = ToolNotInstalledMessage.shellcheck;
            assert.strictEqual(msg, original);
        });
    });

    describe('PermissionDeniedMessage', () => {
        it('应返回正确的权限错误消息', () => {
            const msg = PermissionDeniedMessage('shellcheck');
            assert.ok(msg.includes('Permission denied'), '应包含 "Permission denied"');
            assert.ok(msg.includes('shellcheck'), '应包含工具名称');
        });

        it('应支持不同的工具名称', () => {
            const msg1 = PermissionDeniedMessage('shellcheck');
            const msg2 = PermissionDeniedMessage('shfmt');
            assert.ok(msg1.includes('shellcheck'));
            assert.ok(msg2.includes('shfmt'));
            assert.notStrictEqual(msg1, msg2);
        });

        it('应包含 "Please check file permissions"', () => {
            const msg = PermissionDeniedMessage('tool');
            assert.ok(msg.includes('Please check file permissions'));
        });

        it('应为函数返回字符串', () => {
            const msg = PermissionDeniedMessage('tool');
            assert.strictEqual(typeof msg, 'string');
        });

        it('应处理空工具名', () => {
            const msg = PermissionDeniedMessage('');
            assert.strictEqual(typeof msg, 'string');
            assert.ok(msg.includes('Permission denied'));
        });
    });

    describe('ExecutionErrorMessage', () => {
        it('应返回正确的执行错误消息', () => {
            const msg = ExecutionErrorMessage('shellcheck', 'file not found');
            assert.ok(msg.includes('Failed to run shellcheck'), '应包含 "Failed to run"');
            assert.ok(msg.includes('file not found'), '应包含错误信息');
        });

        it('应支持不同的工具和错误消息', () => {
            const msg1 = ExecutionErrorMessage('tool1', 'error1');
            const msg2 = ExecutionErrorMessage('tool2', 'error2');
            assert.ok(msg1.includes('tool1'));
            assert.ok(msg1.includes('error1'));
            assert.ok(msg2.includes('tool2'));
            assert.ok(msg2.includes('error2'));
        });

        it('应包含 "Failed to run"', () => {
            const msg = ExecutionErrorMessage('tool', 'error');
            assert.ok(msg.includes('Failed to run'));
        });

        it('应正确格式化空错误消息', () => {
            const msg = ExecutionErrorMessage('tool', '');
            assert.ok(msg.includes('Failed to run tool'));
            assert.strictEqual(msg.endsWith(': '), true);
        });

        it('应处理特殊字符', () => {
            const msg = ExecutionErrorMessage('tool', 'error: "test" \n newline');
            assert.ok(msg.includes('error'));
        });

        it('应处理中文错误消息', () => {
            const msg = ExecutionErrorMessage('tool', '中文错误');
            assert.ok(msg.includes('中文错误'));
        });
    });

    describe('FormatIssueMessage', () => {
        it('应为固定字符串', () => {
            assert.strictEqual(typeof FormatIssueMessage, 'string');
        });

        it('应包含 "formatting issues"', () => {
            assert.ok(FormatIssueMessage.includes('formatting issues'));
        });

        it('应包含 "Fix all with shfmt"', () => {
            assert.ok(FormatIssueMessage.includes('Fix all with shfmt'));
        });

        it('应为常量', () => {
            const original = FormatIssueMessage;
            assert.strictEqual(FormatIssueMessage, original);
        });
    });

    describe('消息格式一致性', () => {
        it('所有消息应为字符串', () => {
            assert.strictEqual(typeof ToolNotInstalledMessage.shellcheck, 'string');
            assert.strictEqual(typeof ToolNotInstalledMessage.shfmt, 'string');
            assert.strictEqual(typeof PermissionDeniedMessage('tool'), 'string');
            assert.strictEqual(typeof ExecutionErrorMessage('tool', 'error'), 'string');
            assert.strictEqual(typeof FormatIssueMessage, 'string');
        });

        it('所有消息不应为空', () => {
            assert.ok(ToolNotInstalledMessage.shellcheck.length > 0);
            assert.ok(ToolNotInstalledMessage.shfmt.length > 0);
            assert.ok(PermissionDeniedMessage('tool').length > 0);
            assert.ok(ExecutionErrorMessage('tool', 'error').length > 0);
            assert.ok(FormatIssueMessage.length > 0);
        });

        it('工具未安装消息应包含帮助链接', () => {
            assert.ok(ToolNotInstalledMessage.shellcheck.includes('github.com'));
            assert.ok(ToolNotInstalledMessage.shfmt.includes('github.com'));
        });

        it('所有错误消息应包含工具名引用', () => {
            assert.ok(ToolNotInstalledMessage.shellcheck.toLowerCase().includes('shellcheck'));
            assert.ok(ToolNotInstalledMessage.shfmt.toLowerCase().includes('shfmt'));
            assert.ok(PermissionDeniedMessage('mytool').includes('mytool'));
            assert.ok(ExecutionErrorMessage('mytool', 'error').includes('mytool'));
        });
    });
});
