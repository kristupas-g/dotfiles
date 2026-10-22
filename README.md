# dotfiles

macOS dotfiles managed with [GNU Stow](https://www.gnu.org/software/stow/). Every top-level dotfile and `.config/*` directory is symlinked into `$HOME`.

## Install

```
brew install stow neovim tmux fzf ripgrep fd lazygit tree-sitter-cli gh
brew install --cask wezterm aerospace karabiner-elements visual-studio-code
git clone git@github.com:kristupas-g/dotfiles.git ~/dotfiles
cd ~/dotfiles && stow .
git clone https://github.com/tmux-plugins/tpm ~/.tmux/plugins/tpm
```

Neovim 0.12 or newer is required by the nvim config; it refuses to load plugins on older versions and tells you to upgrade.

`.stow-local-ignore` keeps the repo-only files (README, `nix/`, `.claude/`, the convenience symlinks at the root) out of `$HOME`. Because that file exists, stow's built-in ignore list is off, so anything new that must not be linked has to be added there.

## VS Code

VS Code settings, keybindings, user tasks and the extension list are not in this repo; they come from VS Code Settings Sync, so sign in to Settings Sync first. The synced extension list includes [vscode-neovim](https://marketplace.visualstudio.com/items?itemName=asvetliakov.vscode-neovim), which runs the nvim config from this repo (`~/.config/nvim` after `stow .`). `init.lua` checks `vim.g.vscode`: inside VS Code it loads only `lua/vscode_workflow.lua`, which maps the usual leader keys to VS Code commands, and leaves every UI plugin off.

`bin/gen-code-workspace [dir] [--days N] [--include NAME]` writes a multi-root `<dir>.code-workspace` listing the git repositories directly under `dir` (default `~/vinted`), optionally only those with git activity in the last N days; rerun it after cloning new repositories or to change the set. The GitHub Pull Requests extension needs a one-time GitHub sign-in from the Accounts menu.

## Shell

`.zshrc` holds only the generic, public part of the shell setup. It sources `~/.zshrc.local` at the end for machine-specific aliases, PATH entries and secrets. Keep anything work-related or secret in `~/.zshrc.local`; it is not tracked.

`.gitignore` is also the global git excludes file (`git config --global core.excludesfile ~/.gitignore`), so entries in it apply to every repository on the machine.

## tmux

Prefix is `C-a`. `prefix + I` installs plugins through tpm after the clone above, `prefix + %` reloads the config.

## AeroSpace

Bundle ids for `on-window-detected` rules come from `osascript -e 'id of app "Slack"'`.

## nix

`nix/` is the nix-darwin configuration for the personal machine. See `nix/README.md`.
