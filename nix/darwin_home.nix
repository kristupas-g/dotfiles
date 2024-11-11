{ config, lib, pkgs, _1password-shell-plugins, ...}:

{
  home.stateVersion = "23.05";

  home.packages = [
    (pkgs.nerdfonts.override { fonts = [ "Iosevka" ]; })
    pkgs.neovim
    pkgs.tmux
    pkgs.lazygit
    pkgs.fzf
    pkgs.ripgrep
  ];

  home.file = {
    ".config" = {
      source = config.lib.file.mkOutOfStoreSymlink "${config.home.homeDirectory}/dotfiles/.config";
      recursive = true;
    };
  };

  #
  # You can also manage environment variables but you will have to manually
  # source
  #
  #  ~/.nix-profile/etc/profile.d/hm-session-vars.sh
  #
  # or
  #
  #  /etc/profiles/per-user/davish/etc/profile.d/hm-session-vars.sh
  #
  # if you don't want to manage your shell through Home Manager.
  home.sessionVariables = {
    EDITOR = "nvim";
  };

  # programs._1password-shell-plugins = {
  #   enable = true;
  # };

  xdg.enable = true;
  programs.home-manager.enable = true;
}
