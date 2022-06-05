require("nvim-treesitter.configs").setup({
	ensure_installed = {
		"c",
		"c_sharp",
		"css",
		"go",
		"graphql",
		"html",
		"json",
		"javascript",
		"lua",
		"markdown",
		"python",
		"rust",
		"typescript",
		"yaml",
		"bash",
		"comment",
		"java",
		"org",
	},
	sync_install = false,
	highlight = {
		enable = true,
		additional_vim_regex_highlighting = true,
	},
	indent = { enable = true, disable = { "yaml" } },
	rainbow = {
		enable = true,
		extended_mode = true,
		max_file_lines = nil,
	},
	context_commentstring = {
		enable = true,
	},
	autotag = { enable = true },
})
