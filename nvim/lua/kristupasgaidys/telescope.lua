local actions = require("telescope.actions")
local telescope = require("telescope")
telescope.load_extension("fzf")

telescope.setup({
	defaults = {
		mappings = {
			i = {
				["<esc>"] = actions.close,
			},
		},
		layout_strategy = "vertical",
		path_display = "tail",
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
			on_complete = {
				function()
					vim.cmd("stopinsert")
				end,
			},
			theme = "cursor",
			previewer = false,
			prompt_prefix = "🔍  ",
		},
		lsp_implementations = {
			initial_mode = "normal",
			on_complete = {
				function()
					vim.cmd("stopinsert")
				end,
			},
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
