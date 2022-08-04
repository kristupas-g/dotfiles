require("doom-one").setup({
	cursor_coloring = true,
	terminal_colors = true,
	italic_comments = true,
	enable_treesitter = true,
	transparent_background = true,
	pumblend = {
		enable = true,
		transparency_amount = 10,
	},
	plugins_integrations = {
		bufferline = true,
		telescope = true,
		neogit = true,
		nvim_tree = true,
		dashboard = true,
		whichkey = true,
		indent_blankline = true,
	},
})
