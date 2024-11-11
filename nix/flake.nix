{
  description = "nix config";

  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixpkgs-unstable";

    nix-darwin = {
      url = "github:LnL7/nix-darwin";
      inputs.nixpkgs.follows = "nixpkgs";
    };

    home-manager = {
      url = "github:nix-community/home-manager";
      inputs.nixpkgs.follows = "nixpkgs";
    };

    nix-homebrew.url = "github:zhaofengli-wip/nix-homebrew";
    homebrew-core = {
      url = "github:homebrew/homebrew-core";
      flake = false;
    };
    homebrew-cask = {
      url = "github:homebrew/homebrew-cask";
      flake = false;
    };
    homebrew-bundle = {
      url = "github:homebrew/homebrew-bundle";
      flake = false;
    };
    homebrew-services = {
      url = "github:homebrew/homebrew-services";
      flake = false;
    };
    aerospace-tap = {
      url = "github:nikitabobko/homebrew-tap";
      flake = false;
    };

    _1password-shell-plugins.url = "github:1Password/shell-plugins";
  };

  outputs = inputs@{ self, nix-darwin, home-manager, ... }:
    let
      shared_config = { ... }: {
        services.nix-daemon.enable = true;
        nix.settings.experimental-features = "nix-command flakes";
        programs.zsh.enable = true;

        system.configurationRevision = self.rev or self.dirtyRev or null;
        system.stateVersion = 4;

        nixpkgs.config.allowUnfree = true;

        nix.gc.user = "kristupas";
        nix.gc.automatic = true;
        nix.gc.interval.Hour = 3;
        nix.gc.options = "--delete-older-than 15d";
        nix.optimise.user = "kristupas";
        nix.optimise.automatic = true;
        nix.optimise.interval.Hour = 4;
      };

      brew = { config, lib, ... }: {
        homebrew = {
          enable = true;
          onActivation = {
            upgrade = true;
            autoUpdate = true;
            cleanup = "zap";
          };

          casks = [
            "firefox"
            "spotify"
            "wezterm"
            "karabiner-elements"
            "1password"
            "aerospace"
            "qbittorrent"
          ];
        };
    };
    in
    {
      darwinConfigurations.kristupas_mac = nix-darwin.lib.darwinSystem {
        specialArgs = { inherit inputs; };
        modules = [
          shared_config
          inputs.nix-homebrew.darwinModules.nix-homebrew
          {
            nix-homebrew = {
              enable = true;
              enableRosetta = true;
              user = "kristupas";
              taps = {
                "homebrew/homebrew-core" = inputs.homebrew-core;
                "homebrew/homebrew-cask" = inputs.homebrew-cask;
                "homebrew/homebrew-services" = inputs.homebrew-services;
                "homebrew/homebrew-bundle" = inputs.homebrew-bundle;
                "nikitabobko/homebrew-tap" = inputs.aerospace-tap;
              };
              mutableTaps = false;
            };
          }
          brew
          ./darwin.nix
          home-manager.darwinModules.home-manager
          {
            home-manager.useGlobalPkgs = true;
            home-manager.useUserPackages = true;
            home-manager.users.kristupas = import ./darwin_home.nix;
            home-manager.extraSpecialArgs = inputs;
          }
        ];
      };
    };
}
