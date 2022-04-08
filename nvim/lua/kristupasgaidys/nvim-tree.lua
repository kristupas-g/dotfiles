require("nvim-tree").setup{
    disable_netrw = true,
    hijack_netrw = true,
    open_on_setup = false,
    ignore_buffer_on_setup = false,
    auto_reload_on_write = true,
    hijack_unnamed_buffer_when_opening = false,
    hijack_directories = {
      enable = true,
      auto_open = true,
    },
    update_to_buf_dir = {
      enable = true,
      auto_open = true,
    },
    auto_close = false,
    open_on_tab = false,
    hijack_cursor = true,
    update_cwd = true,
    diagnostics = {
      enable = true,
    },
    update_focused_file = {
      enable = true,
      update_cwd = true,
      ignore_list = {},
    },
    system_open = {
      cmd = nil,
      args = {},
    },
    git = {
      enable = false,
      ignore = false,
      timeout = 200,
    },
    view = {
      width = 50,
      height = 30,
      hide_root_folder = true,
      side = "left",
      auto_resize = true,
      mappings = {
        custom_only = false,
        list = {},
      },
      number = false,
      relativenumber = false,
      signcolumn = "yes",
    },
    filters = {
      dotfiles = false,
      custom = { "node_modules", ".cache", "yarn.lock" },
    },
    trash = {
      cmd = "trash",
      require_confirm = true,
    },
    actions = {
      change_dir = {
        global = false,
      },
      open_file = {
        quit_on_open = true,
      },
      window_picker = {
        enable = false,
        chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890",
        exclude = {},
      },
    },
  show_icons = {
    git = 1,
    folders = 1,
    files = 1,
    folder_arrows = 0,
  },
  root_folder_modifier = ":t",
  highlight_opened_files = 1,
}
