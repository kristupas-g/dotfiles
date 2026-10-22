# nix-darwin config for the personal Mac

Untested since the 2025 nix-darwin changes (no nix on the work machine). Run `nix flake update` and `sudo darwin-rebuild switch` on the personal machine and fix whatever it reports.

## Installing the nix package manager

```
curl --proto '=https' --tlsv1.2 -sSf -L https://install.determinate.systems/nix | sh -s -- install --prefer-upstream-nix
```

The Determinate installer now installs Determinate Nix by default. nix-darwin can only manage upstream Nix, so either pass `--prefer-upstream-nix` as above, or keep Determinate Nix and set `nix.enable = false;` in `flake.nix` and delete every other `nix.*` option (they become invalid when nix-darwin does not manage Nix).

## First install

```
sudo nix run --extra-experimental-features 'nix-command flakes' nix-darwin/master#darwin-rebuild -- switch --flake ~/dotfiles/nix#kristupas_mac
```

## Rebuilding

`darwin-rebuild` has to run as root since January 2025:

```
sudo darwin-rebuild switch --flake ~/dotfiles/nix#kristupas_mac
```

The `rebuild` alias in `.zshrc` does this.

## What changed in 2025 and is reflected here

- `services.nix-daemon.enable` was removed; nix-darwin always manages the daemon while `nix.enable` is true.
- `nix.gc.user` and `nix.optimise.user` were removed; both services run as root.
- `system.primaryUser` is required for user-scoped options such as `homebrew`.
- `homebrew.taps` is set from `nix-homebrew.taps` so `cleanup = "zap"` does not try to untap the immutable taps.
- `pkgs.nerdfonts.override { fonts = [...] }` was replaced by per-font packages such as `pkgs.nerd-fonts.iosevka`.
- The nix-darwin repository moved from `LnL7/nix-darwin` to `nix-darwin/nix-darwin`.
- `system.stateVersion` was left at 4 on purpose. Raising it (max 7) changes defaults; read the nix-darwin changelog first.
