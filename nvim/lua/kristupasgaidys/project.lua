local project = require("project_nvim")
local telescope = require("telescope")

project.setup({
	detection_methods = { "lsp", "pattern" },
	patterns = {
		".git",
		"Makefile",
		"package.json",
		"!.git/feat",
		"!.git/fix",
		"!.git/patch",
	},
	exclude_dirs = {},
	show_hidden = true,
	silent_chdir = true,
	datapath = vim.fn.stdpath("data"),
})

telescope.load_extension("projects")

normal("<leader>pp", telescope.extensions.projects.projects, "Switch project")
