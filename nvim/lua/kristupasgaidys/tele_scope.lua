local actions = require("telescope.actions")
local telescope = require("telescope")

telescope.setup({
	defaults = {
		mappings = {
			i = { ["<esc>"] = actions.close },
		},
		layout_strategy = "vertical",
		path_display = function(opts, path)
			return require("telescope.utils").path_smart(path)
		end,
	},
	pickers = {
		find_files = {
			theme = "dropdown",
			shorten_path = true,
			previewer = false,
			prompt_prefix = "🔍  ",
		},
		help_tags = {
			theme = "dropdown",
			previewer = false,
			prompt_prefix = "🤨 ",
		},
		lsp_references = {
			theme = "cursor",
			initial_mode = "normal",
			previewer = false,
			prompt_prefix = "🔍  ",
		},
		lsp_implementations = {
			theme = "cursor",
			initial_mode = "normal",
			previewer = false,
			prompt_prefix = "🔍  ",
		},
		buffers = {
			theme = "cursor",
			previewer = false,
			prompt_prefix = "🪟 ",
		},
	},
	extensions = {
		fzf = {
			fuzzy = true,
			override_generic_sorter = true,
			override_file_sorter = true,
			case_mode = "smart_case",
		},
		["ui-select"] = {},
	},
})

require("telescope").load_extension("ui-select")

local builtins = require("telescope.builtin")
normal("<leader><leader>", builtins.find_files, "Find files")
normal("<leader>h", builtins.help_tags, "Help")
normal("<leader>.", builtins.buffers, "Switch buffers")
