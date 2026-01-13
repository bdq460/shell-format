# Shell Format

> Intelligent Shell script formatting and checking tool based on shfmt and shellcheck

## Quick Start

### Feature Overview

- **Smart Formatting** - Automatically format Shell scripts with shfmt
- **Error Detection** - Detect syntax and semantic errors with shellcheck
- **Automatic Diagnosis** - Automatic checking when opening, saving, or editing
- **Quick Fixes** - One-click fix for formatting issues
- **Detailed Logs** - Timestamped operation logs

## Configuration Options

### Complete Configuration Example

```json
{
  "shell-format.shellcheckPath": "shellcheck",
  "shell-format.shfmtPath": "shfmt",
  "shell-format.tabSize": 2,
  "shell-format.logOutput": "off",
  "shell-format.onError": "showProblem"
}
```

### Configuration Description

#### `shell-format.shellcheckPath`

- **Type**: string
- **Default**: `shellcheck`
- **Description**: shellcheck executable path

#### `shell-format.shfmtPath`

- **Type**: string
- **Default**: `shfmt`
- **Description**: shfmt executable path

#### `shell-format.tabSize`

- **Type**: number | string
- **Options**:
  - `vscode`: Use VSCode's indent settings
  - `ignore`: Do not validate indentation
  - Number: Number of spaces (e.g., `2`, `4`)
- **Default**: `vscode`
- **Description**: Indentation settings

#### `shell-format.logOutput`

- **Type**: string
- **Options**:
  - `off`: Disable log output
  - `on`: Enable log output
- **Default**: `off`
- **Description**: Whether to output logs to console and output window

#### `shell-format.onError`

- **Type**: string
- **Options**:
  - `ignore`: Ignore errors
  - `showProblem`: Show problems
- **Default**: `showProblem`
- **Description**: Error handling method

## Plugin Commands

### Format Commands

| Command | Description |
|---------|-------------|
| Format document with shell-format | Format entire document |

### Fix Commands

| Command | Description |
|---------|-------------|
| Fix All Problems By Shellformat | Fix all formatting issues with one click |

## Usage

### 1. Format Document

#### Method 1: Format Entire Document

- Shortcut: `Shift+Alt+F` (Windows/Linux) or `Shift+Option+F` (macOS)
- Right-click menu: Select "Format Document"
- Command Palette: Enter "Format Document By Shellformat"

#### Method 2: Format Selected Text

- Select the code to format
- Shortcut: `Ctrl+K Ctrl+F` (Windows/Linux) or `Cmd+K Cmd+F` (macOS)
- Right-click menu: Select "Format Selection"

> Note: Shell script formatting requires full context (if/fi, do/done pairing), so even when text is selected, the entire document is formatted. VSCode automatically crops changes within the selection.

### 2. Quick Fix Issues

#### Fix Single Issue

- Hover mouse over error code
- Click yellow light bulb icon
- Select "Fix this issue with shell-format"

#### Fix All Issues

- Click yellow light bulb icon in code editor
- Select "Fix all problems with shell-format"
- Or execute "Shell Format: Fix All Problems By Shellformat" in Command Palette

### 3. View Errors and Warnings

- Open VSCode's "Problems" panel (`Ctrl+Shift+M` / `Cmd+Shift+M`)
- View all shell script errors and warnings
- Error sources:
  - `shellcheck`: Syntax and semantic errors (red)
  - `shell-format`: Formatting issues (yellow)

### 4. View Logs

- Open Output panel (`Ctrl+Shift+U` / `Cmd+Shift+U`)
- Select "shell-format" channel to view detailed logs
- All log lines include timestamps in `[HH:MM:SS]` format

## Formatting Example

### Before Formatting

```bash
#!/bin/bash
if [ -f "test.txt" ];then
echo "file exists"
fi
```

### After Formatting

```bash
#!/bin/bash
if [ -f "test.txt" ]; then
    echo "file exists"
fi
```

## Supported File Types

- `.sh` - Shell scripts
- `.bash` - Bash scripts
- `.zsh` - Zsh scripts

## Troubleshooting

### Formatting Not Working

1. **Check if shfmt is installed**

   ```bash
   shfmt --version
   ```

2. **Check shfmt path configuration**

   ```json
   {
     "shell-format.shfmtPath": "/path/to/shfmt"
   }
   ```

3. **View logs**

   - Open Output panel (`Ctrl+Shift+U`)
   - Select "shell-format" channel
   - Enable logs in settings: `shell-format.logOutput: on`

### Error Detection Not Working

1. **Check if shellcheck is installed**

   ```bash
   shellcheck --version
   ```

2. **Check shellcheck path configuration**

   ```json
   {
     "shell-format.shellcheckPath": "/path/to/shellcheck"
   }
   ```

3. **Check error handling method**

   ```json
   {
     "shell-format.onError": "showProblem"
   }
   ```

### Plugin Not Activating

1. Check if file extension is `.sh`, `.bash`, or `.zsh`
2. Open a Shell script file
3. Check if "Problems" panel shows errors

## FAQ

### Q: Why is the entire document formatted when I format selected text?

A: Shell script formatting requires full context (like if/fi, do/done pairing), so even when text is selected, shfmt formats the entire document. VSCode automatically crops changes within the selection and applies them to the editor.

### Q: Can shellcheck errors be automatically fixed?

A: No. shellcheck detects semantic errors and best practice issues, which developers need to fix manually based on specific scenarios. Only formatting issues (detected by shfmt) can be automatically fixed.

### Q: How to disable specific shellcheck warnings?

A: You can use comments in your script to disable specific warnings:

```bash
#!/bin/bash
# shellcheck disable=SC2034
local unused_var="test"

# Disable multiple warnings
# shellcheck disable=SC2034,SC2154
```

### Q: How to view detailed logs?

A:

1. Enable logs in settings: `shell-format.logOutput: on`
2. Open Output panel (`Ctrl+Shift+U` / `Cmd+Shift+U`)
3. Select "shell-format" channel

### Q: Will this plugin affect VSCode performance?

A: No. The plugin uses debouncing (500ms) to avoid frequent diagnostic triggers. All external commands are executed asynchronously and won't block the UI.

## System Requirements

### VSCode Version

- VSCode >= 1.74.0

### External Tools

#### shfmt (Required)

Shell script formatting tool

**macOS**:

```bash
brew install shfmt
```

**Linux (Ubuntu/Debian)**:

```bash
sudo apt-get install shfmt
```

**Install with Go**:

```bash
go install mvdan.cc/sh/v3/cmd/shfmt@latest
```

#### shellcheck (Recommended)

Shell script static analysis tool

**macOS**:

```bash
brew install shellcheck
```

**Linux (Ubuntu/Debian)**:

```bash
sudo apt-get install shellcheck
```

**Install with Go**:

```bash
go install github.com/koalaman/shellcheck/cmd/shellcheck@latest
```

> Note: shellcheck is optional. If not installed, the plugin will only use shfmt for formatting and basic checking.

## Contact Developer

For questions or suggestions, please contact via:

- **GitHub Issues**: [Submit an Issue](https://github.com/bdq460/shell-format/issues)
- **Email**: [Send Email](mailto:bdq460@gmail.com)

## Links

- [GitHub](https://github.com/bdq460/shell-format)
- [Issues](https://github.com/bdq460/shell-format/issues)
- [License](LICENSE)

## Acknowledgments

Thanks to the following open source tools:

- [shfmt](https://github.com/mvdan/sh) - Shell script formatting tool
- [shellcheck](https://github.com/koalaman/shellcheck) - Shell script static analysis tool
