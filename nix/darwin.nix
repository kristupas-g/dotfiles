{ config, pkgs, ... }:
{
  nixpkgs.hostPlatform = "aarch64-darwin";

  users.users.kristupas = {
    name = "kristupas";
    home = "/Users/kristupas";
  };
}
