return {
  "nvim-neo-tree/neo-tree.nvim",
  branch = "v2.x",
  dependencies = {
    "nvim-lua/plenary.nvim",
    "MunifTanjim/nui.nvim",
  },
  lazy = false,
  keys = {
    { "<leader>ft", ":NeoTreeFloatToggle<cr>", desc = "File tree" },
  },
  opts = {
    hide_root_node = true,
    use_popups_for_input = false,
    close_if_last_window = true,
    popup_border_style = "rounded",
    enable_git_status = false,
    enable_diagnostics = false,
    sort_case_insensitive = true,
    default_component_configs = {
      indent = {
        padding = 2,
        with_expanders = true,
      },
    },
    window = {
      mappings = {
        ["l"] = "open",
        ["p"] = { "toggle_preview", config = { use_float = true } },
        ["h"] = "close_node",
        ["z"] = "close_all_nodes",
        ["a"] = {
          "add",
          config = {
            show_path = "none",
          },
        },
        ["A"] = "add_directory",
        ["d"] = "delete",
        ["r"] = "rename",
        ["m"] = "move",
        ["q"] = "close_window",
      },
    },
    filesystem = {
      filtered_items = {
        visible = false,
        hide_by_name = {
          "node_modules",
        },
        hide_by_pattern = {
          "*.meta",
          "*/src/*/tsconfig.json",
        },
        always_show = {
          ".gitignored",
        },
        never_show = {
          ".DS_Store",
        },
        never_show_by_pattern = {},
      },
      follow_current_file = true,
      group_empty_dirs = true,
      hijack_netrw_behavior = "open_current",
      use_libuv_file_watcher = true,
      window = {
        position = "float",
        mappings = {
          [".."] = "navigate_up",
          ["."] = "set_root",
          ["H"] = "toggle_hidden",
        },
      },
    },
  },
}
