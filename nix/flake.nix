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
  };

  outputs = inputs@{ self, nix-darwin, home-manager, ... }:
    let
      config = { ... }: {
        services.nix-daemon.enable = true;
        nix.settings.experimental-features = "nix-command flakes";
        programs.zsh.enable = true;
        # programs.fish.enable = true;

        system.configurationRevision = self.rev or self.dirtyRev or null;
        system.stateVersion = 4;

        nixpkgs.config.allowUnfree = true;
      };
    in
    {
      darwinConfigurations.kristupas_mac = nix-darwin.lib.darwinSystem {
        specialArgs = { inherit inputs; };
        modules = [
          config
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
