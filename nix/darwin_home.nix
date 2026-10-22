{ config, lib, pkgs, ... }:

{
  home.stateVersion = "23.05";

  home.packages = [
    pkgs.nerd-fonts.iosevka
    pkgs.neovim
    pkgs.tmux
    pkgs.lazygit
    pkgs.fzf
    pkgs.ripgrep
    pkgs.fd
    pkgs.tree-sitter
  ];

  home.file = {
    ".config" = {
      source = config.lib.file.mkOutOfStoreSymlink "${config.home.homeDirectory}/dotfiles/.config";
      recursive = true;
    };
  };

  home.sessionVariables = {
    EDITOR = "nvim";
  };

  xdg.enable = true;
  programs.home-manager.enable = true;
}
