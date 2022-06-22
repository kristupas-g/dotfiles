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

normal("<leader><leader>", require("telescope.builtin").find_files, "Find files")
normal("<leader>h", require("telescope.builtin").help_tags, "Help")
