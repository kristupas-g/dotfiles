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
| Herdr app (GUI) | `.config/herdr-app/settings.json`, `keys.json`, `layouts/main-copy.json` | live on save |
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
- `.config/herdr-app/` is the GUI app. Only `settings.json`, `keys.json`, `programs.json` and `layouts/main-copy.json` are user-owned and tracked; the rest is ignored. `.config/herdr-app/AGENTS.md` is the app's own reference: it's rewritten on every start, so read it there before editing. Shipped layouts and mods there are replaced on every start. To customise one, clone it with `herdr-app do layout.clone` / `mod.clone`, then add a `!` exception for the clone to `.gitignore`. After an edit, check for a `<name>.error` file next to the edited file.
- The personal layout is `layouts/main-copy.json`, which is tracked. The plugin installers below cloned it from `main` and edit it on install and uninstall, so commit it after running any of them.
- Plugins (app mods) aren't tracked, because their folders hold binaries and machine-specific paths. On a new machine, open the app and reinstall them; each command also updates its plugin:
  - herdr-nvim: `curl -fsSL https://raw.githubusercontent.com/ChmaraX/herdr-nvim/main/install.sh | sh -s -- --app`. Its settings are in the tracked `.config/herdr-nvim/config.toml`. `tree = "nvim"` makes `cmd-e` open nvim alone, without the native file tree. Change it with `~/.config/herdr-app/mods/herdr-nvim/bin/herdr-nvim app-config tree native|nvim`.
  - herdr-gitview: `curl -fsSL https://raw.githubusercontent.com/ChmaraX/herdr-gitview/main/install.sh | sh -s -- --app`
  - herdr-chat: `curl -fsSL https://raw.githubusercontent.com/ChmaraX/herdr-chat/main/install.sh | sh -s -- --app --no-subagents`. Without `--no-subagents` it writes a block into `~/.claude/CLAUDE.md` and templates into `~/.config/herdr-core/templates/`. `⌘I` opens a Claude Code chat and `⌘⇧I` opens the agent picker. Those keys are set in the tracked `data/herdr-chat/keys.json` (`"global"` part), which the installer applies to `keys.json`. The tracked `data/herdr-chat/settings.json` is the chat's own config (the installer never writes it): its `claude.args` start every chat with `--model fable --permission-mode auto`. The thinking level comes from `~/.claude/settings.json`'s top-level `effortLevel` (set to `high` there; the chat host ignores `--effort` and `modelSettings`), which the CLI uses too.
  - herdr-auto-title: copy `mod/mods/auto-title` from a tagged release of kryptamine/herdr-auto-title into `mods/`, then press `cmd-alt-t` → Install. The popup installs a login service that updates itself.
  - Uninstall: the same command with `--uninstall`. For auto-title, run `~/Library/Application\ Support/herdr-auto-title/bin/herdr-auto-title desktop uninstall` and delete `mods/auto-title`.
  - The plugin keys are already in the tracked `keys.json`, and the installers only bind free keys.
- `herdr plugin` belongs to the terminal `herdr`, not the app. The app doesn't use it.
- Icons: `programs.json` swaps the one-color nvim, lazygit and shell icons for the colored SVGs in `my-icons/`. Tabs holding only a mod pane (the chat, gitview) have no program, so the tab bar shows no icon for them. `mods/tabs-icons/` is a clone of Herdr's `tabs` mod made with `mod.clone`, with a `MOD_ICONS` fallback added, and `main-copy.json` uses it instead of `tabs`. Clones never get Herdr's updates; to pick up a newer `tabs`, clone it again and re-add `MOD_ICONS`.
- `mods/prs/` is our own mod and is tracked. Without props it's the "Pull requests" list under Agents in the sidebar of `main-copy.json` (`list.js`): your open GitHub PRs grouped by repo, read with `gh api graphql` once a minute (so `gh auth login` must be done). The circle on each row is the head commit's combined CI state (green passed, red failed, spinner running, hollow none); clicking it opens the Jenkins build behind the status (the Jenkins URL GitHub reports, a failing one first). Clicking the row opens the PR as a tab named `#<number>` in the shown space: the same mod with props `{view: {repo, number}}` (`view.js`): the diff in a virtual list with review threads under their lines (`diff.js` parses `gh pr diff` and anchors `pulls/<n>/comments`), a Comments tab (description, reviews, comments, threads as markdown), a GitHub button, a Space button (a space named `<repo> #<n>` on the PR's branch: the clone in `~/vinted/<repo>` when it's already on that branch, else a git worktree of it at `~/.herdr/worktrees/<repo>/<branch>`; a fork's branch is fetched from the PR ref), the CI circle, and Close and Merge buttons that ask once before running `gh pr close` / `gh pr merge` (squash if the repo allows it, else merge, else rebase). After either, shared `prs.refresh` makes the list re-read. Each sidebar row also has a folder button that opens the PR as a space (`openSpaceFor` in `gh.js`); a space already open for the PR, by name or folder, is shown instead. Only the circles show in the narrow rail.
- `mods/repo-picker/` is our own mod and is tracked: cmd-n (`mod.open:repo-picker` in `keys.json`, instead of `space.new`) lists the folders in `~/vinted`; type to filter, Enter makes a space named after the repo with the repo as its folder, or goes to the space that already has it. The sidebar's + still runs plain `space.new`.
- `mods/space-picker/` is our own mod and is tracked: cmd-p (`mod.open:space-picker`, instead of Herdr's tab picker) lists the spaces with folder, branch and agent state; type to filter, Enter goes there. Herdr's own picker (tabs and agents too) is still in the palette as "Go to space or tab…".
- `mods/palette-plus/` is a copy of Herdr's `frame/palette` (the app rewrites `frame/`, so it can't be extended in place) with our entries in `EXTRA`: "New Claude Code agent in this space" (a chat tab, like cmd-i), and the two pickers. cmd-shift-p opens it (`mod.open:palette-plus`, instead of `app.palette`). To take a newer palette, copy `frame/palette/main.js` over it and re-apply `EXTRA`, the `act` branch in `go` and `mod.json`'s overlay.
- `mods/tabs-icons/` has no + button and no Changes button in the tab bar: tabs come from space-tabs and the diff lives in the gitview tab. Re-add the two lines near the end of its `render` to get them back.
- `mods/git-actions/` is our own mod and is tracked: a bar floating at the bottom of the window while the gitview tab is shown (a root `floating` block in `main-copy.json`; it draws nothing on other tabs). It shows the space's branch against its upstream (not pushed, ↑n to push, ↓n behind, up to date, n uncommitted), a Push button (`git push`, `-u origin <branch>` the first time) and Create PR, a dialog (title and body from the last commit, base from the repo's default branch, Draft) that pushes first when needed, runs `gh pr create`, stamps shared `prs.refresh` and opens the PR as a `prs` tab. A branch that already has an open PR shows "PR #n" instead, which opens that tab. Git runs every 5 s while shown, the PR lookup every 30 s.
- `mods/status-bar/` is our own mod and is tracked: the bottom bar in place of Herdr's `workspace-status`, without the machine name and the agent count. It has the FortiClient VPN state (`scutil --nc status VPN`, polled every 5 s: green with the profile name when connected, red "VPN off" when not) and the palette hint. Clicking the VPN chip writes `VpnName` = `vinted-vpn v2` into the extension's prefs (`defaults` domain `com.fortinet.forticlient.macos.vpn`) and runs `scutil --nc start VPN`; if it isn't up in 8 s, FortiClient is opened to connect from. That connect path is best effort: it was written while the VPN was up and hasn't been exercised. FortiClient's own CLIs need root.
- `mods/blank/` draws nothing. It fills the sidebar's top block in `main-copy.json` (36 px, still the window-drag area under the traffic lights) in place of `workspace-chrome` (the Herdr title, search and collapse buttons); the sidebar footer block (Settings, Add machine) is `hidden`. Settings are still in the palette and the app menu.
- Panes have no header: `main`'s `pane` in `main-copy.json` has no `header` (herdr-nvim's `herdr-nvim-header` used to be there); the border, focus outline and radius stay.
- `mods/space-tabs/` is our own mod and is tracked. Every space on this machine gets a claude chat, nvim (`nvim .`, which opens oil) with a shell pane below it at 25% height, gitview and lazygit, in that order, ahead of the tabs it already has. `pane.split` takes no size, so the mod writes pane weights into herdr-core's `herdr-app` document (`hc connect`, `doc.get`/`doc.set`). The tab list is `TABS` in its `main.js`. It runs from the `space-tabs` floating block in `main-copy.json`. Each space is set up once (ids in shared `space-tabs.seeded` and `space-tabs.nvim-shell-2`), so a tab closed later stays closed. Tabs open in their final order and the starter shell closes at once; gitview-tab focuses its file list when built, which shows its tab, so the claude tab is held until it has stayed shown for a second. The loop looks for new spaces every 200 ms. When creating a mod, Herdr adds a visible copy of it to the shown layout; remove that block from `main-copy.json` if the mod belongs in `floating` instead.

## zsh

- The repo `.zshrc` is the generic, public shell config, and `.stow-local-ignore` keeps it out of `~`. `~/.zshrc` on the work machine is a separate, untracked file with work aliases and credentials.
- For a change you want on every machine, edit the repo `.zshrc`, and apply it to `~/.zshrc` too if it should take effect here. Never copy anything from `~/.zshrc` into the repo without checking it for work-specific paths, hosts and passwords. The repo is public on GitHub.

## Conventions

- Commit messages use Conventional Commits with a scope: `feat(herdr): ...`, `chore: ...`, `docs: ...`. Commit straight to `main`.
- Commit only the files for the change at hand; the working tree often has unrelated uncommitted edits (nvim, karabiner).
- Update `README.md` when install steps or required tools change.
