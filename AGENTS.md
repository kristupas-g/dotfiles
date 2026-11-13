# AGENTS.md

macOS dotfiles for one person, linked into `$HOME` with GNU Stow (`stow .` from the repo root). `README.md` has the install steps.

## How the linking works

- `~/.config` is a single symlink to `~/dotfiles/.config` (stow folded the whole directory). Anything an app writes to `~/.config` lands in this repo. New apps show up as untracked directories; either track their config or add them to `.gitignore`. Never commit runtime state, logs, sockets, caches or credentials.
- Top-level dotfiles (`.tmux.conf`, `.gitignore`, `.alacritty.toml`, `.emacs.d`) and `bin/` are symlinked individually into `~`.
- `.stow-local-ignore` lists what stow must not link (README, `nix/`, `AGENTS.md`, `CLAUDE.md`, `.zshrc`, the convenience symlinks at the root). Because the file exists, stow's default ignore list is off: any new repo-only file at the root must be added there, or `stow .` will link it into `~`.
- The root symlinks `aerospace`, `k9s`, `karabiner`, `lazygit`, `nvim`, `wezterm` point into `.config/` for convenience. Edit through either path; it's the same file.
- Edits in the repo are live immediately because `~` points here. No re-stow is needed unless you add a new top-level file or directory.

## Stack and where each config lives

| Tool | File | How to apply a change |
|---|---|---|
| Neovim (0.12+) | `.config/nvim/init.lua`, `lazy-lock.json`, `lua/vscode_workflow.lua`, `after/ftplugin/` | restart nvim |
| tmux (prefix `C-a`, tpm) | `.tmux.conf` | `prefix + %` or `tmux source-file ~/.tmux.conf` |
| herdr (terminal multiplexer) | `.config/herdr/config.toml` | `prefix + %` inside herdr |
| Herdr app (GUI) | `.config/herdr-app/settings.json`, `keys.json` | live on save |
| zsh (oh-my-zsh) | see below | `exec zsh` |
| WezTerm | `.config/wezterm/wezterm.lua` | reloads on save |
| AeroSpace | `.config/aerospace/aerospace.toml` | `aerospace reload-config` |
| Karabiner-Elements | `.config/karabiner/karabiner.json`, `assets/complex_modifications/` | live; the Karabiner GUI also rewrites `karabiner.json` |
| lazygit | `.config/lazygit/config.yml` | restart lazygit |
| k9s | `.config/k9s/config.yaml` | restart k9s |
| nix-darwin + home-manager (personal Mac only) | `nix/` | `sudo darwin-rebuild switch --flake ~/dotfiles/nix#kristupas_mac`; see `nix/README.md` |
| Scripts | `bin/` (on `PATH` as `~/bin`) | run directly |

Emacs (`.emacs.d`) and Alacritty (`.alacritty.toml`) are still tracked but not installed on the current machine. Leave them alone unless asked.

## Neovim

- Everything is in one `init.lua`: options, keymaps, then a single `require('lazy').setup({...})` with every plugin spec inline. Add a plugin by adding a spec to that table; don't split it into `lua/plugins/` unless asked.
- The top of `init.lua` refuses to start on Neovim older than 0.12. Use the 0.12 APIs already in use there (`vim.lsp.config`, `vim.lsp.enable`, `vim.diagnostic.jump`).
- The leader is space. LSP keymaps are set in the `LspAttach` autocmd. Servers and tools are installed through mason-lspconfig and mason-tool-installer, and are configured with `vim.lsp.config(...)`. `ruby_lsp` runs through `mise x --`.
- `vim.g.vscode` is set when running inside VS Code (vscode-neovim). Then only `lua/vscode_workflow.lua` loads, and UI plugins stay off. Keep new UI plugins and options behind `if not in_vscode`.
- `gwt` is a local plugin loaded from `~/vinted/worktree-cli`. It is not in the repo.
- Plugin versions are pinned in `lazy-lock.json`. To update them, run `nvim --headless "+Lazy! sync" +qa` and commit the lockfile on its own.
- Smoke test after editing: `nvim --headless +qa` must exit without output.

## herdr and the Herdr app

- `.config/herdr/config.toml` is the terminal multiplexer. Its keys mirror `.tmux.conf` (prefix `ctrl+a`, `h/j/k/l` focus, `r`/`d` splits, `q` close, `%` reload); keep the two in sync when changing bindings. `.gitignore` ignores everything in `.config/herdr/` except `config.toml`.
- `.config/herdr-app/` is the GUI app. Only `settings.json`, `keys.json` and `programs.json` are user-owned and tracked; the rest is ignored. `.config/herdr-app/AGENTS.md` is the app's own reference: it's rewritten on every start, so read it there before editing. Shipped layouts and mods there are replaced on every start. To customise one, clone it with `herdr-app do layout.clone` / `mod.clone`, then add a `!` exception for the clone to `.gitignore`. After an edit, check for a `<name>.error` file next to the edited file.

## zsh

- The repo `.zshrc` is the generic, public shell config, and `.stow-local-ignore` keeps it out of `~`. `~/.zshrc` on the work machine is a separate, untracked file with work aliases and credentials.
- For a change you want on every machine, edit the repo `.zshrc`, and apply it to `~/.zshrc` too if it should take effect here. Never copy anything from `~/.zshrc` into the repo without checking it for work-specific paths, hosts and passwords. The repo is public on GitHub.

## Conventions

- Commit messages use Conventional Commits with a scope: `feat(herdr): ...`, `chore: ...`, `docs: ...`. Commit straight to `main`.
- Commit only the files for the change at hand; the working tree often has unrelated uncommitted edits (nvim, karabiner).
- Update `README.md` when install steps or required tools change.
