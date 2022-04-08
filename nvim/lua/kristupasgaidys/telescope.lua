local actions = require("telescope.actions")
require('telescope').load_extension('fzf')
require'telescope'.load_extension('project')

require('telescope').setup{
  defaults = {
    mappings = {
      i = {
        ["<esc>"] = actions.close
      },
    },
    layout_strategy = 'vertical',
    layout_config = { height = 0.95 }
  },
  pickers = {
    find_files = {
      shorten_path = true,
      previewer = false,
      prompt_prefix = "🔍 ",
    },
  },
   extensions = {
    fzf = {
      fuzzy = true,                    -- false will only do exact matching
      override_generic_sorter = true,  -- override the generic sorter
      override_file_sorter = true,     -- override the file sorter
      case_mode = "smart_case",        -- or "ignore_case" or "respect_case"
                                       -- the default case_mode is "smart_case"
    },
    project = {
      base_dirs = {
        '~/Documents/repos',
      },
      hidden_files = false,
  }
  },
}
