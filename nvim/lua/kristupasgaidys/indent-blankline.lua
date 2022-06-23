require("indent_blankline").setup({
	indentLine_enabled = 1,
	char = "▏",
	use_treesitter = true,
	show_trailing_blankline_indent = false,
	show_first_indent_level = false,
	indent_level = 20,
	max_indent_increase = 1,
	filetype_exclude = { "dashboard" },
})

normal("<leader>ti", ":IndentBlanklineToggle<cr>", "Toggle indent lines")
