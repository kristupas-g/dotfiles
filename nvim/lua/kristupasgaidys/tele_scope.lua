local actions = require("telescope.actions")
local telescope = require("telescope")
telescope.load_extension("fzf")
telescope.load_extension("git_worktree")

telescope.setup({
	defaults = {
		mappings = {
			i = {
				["<esc>"] = actions.close,
			},
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
		lsp_references = {
			initial_mode = "normal",
			previewer = false,
			prompt_prefix = "🔍  ",
		},
		lsp_implementations = {
			initial_mode = "normal",
			theme = "cursor",
			previewer = false,
			prompt_prefix = "🔍  ",
		},
	},
	extensions = {
		fzf = {
			fuzzy = true,
			override_generic_sorter = true,
			override_file_sorter = true,
			case_mode = "smart_case",
		},
	},
})
