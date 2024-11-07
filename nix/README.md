## Installing the nix package manager 
Uses determinate systems installer
```
curl --proto '=https' --tlsv1.2 -sSf -L https://install.determinate.systems/nix | sh -s -- install
```

## Installing the config
```
sudo nix run --extra-experimental-features 'nix-command flakes' nix-darwin -- switch --flake ~/dotfiles/nix/flake.nix
```

## After

After the config is installed `nix-darwin` command can be used directly, as such:
```
darwin-rebuild switch --flake ~/dotfiles/nix/flake.nix
```

