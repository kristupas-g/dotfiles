return {
	"lukas-reineke/indent-blankline.nvim",
	keys = {
		{ "<leader>ti", ":IndentBlanklineToggle<cr>", desc = "Toggle indent lines" },
	},
	lazy = false,
	opts = {
		indentLine_enabled = 1,
		char = "▏",
		use_treesitter = true,
		show_trailing_blankline_indent = false,
		show_first_indent_level = false,
		indent_level = 20,
		max_indent_increase = 1,
	},
}
