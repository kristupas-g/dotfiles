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
	},
	sync_install = false,
	ignore_install = { "" },
	highlight = {
		enable = true,
		additional_vim_regex_highlighting = true,
	},
	indent = { enable = true, disable = { "yaml" } },
	rainbow = {
		enable = true,
		extended_mode = true,
		max_file_lines = 1000,
		colors = { "#F2CDCD", "#DDB6F2", "#E8A2AF", "#F8BD96", "#FAE3B0", "#ABE9B3", "#96CDFB" }, -- table of hex strings
	},
	context_commentstring = {
		enable = true,
	},
	indent = { enable = true, disable = { "yaml" } },
	autotag = { enable = true },
})
