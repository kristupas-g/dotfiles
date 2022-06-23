require("lualine").setup({
	options = {
		theme = "gruvbox-material",
		component_separators = "|",
		section_separators = { left = "", right = "" },
		disabled_filetypes = { "org", "NvimTree", "dashboard" },
		globalstatus = true,
	},
	sections = {
		lualine_a = {
			{ "branch", icon = "", separator = { left = "" }, right_padding = 2 },
		},
		lualine_b = {
			{
				"filename",
				symbols = {
					modified = " ",
					readonly = " 🔍",
					unnamed = "Scratch",
				},
			},
		},
		lualine_c = {},
		lualine_x = {},
		lualine_y = {},
		lualine_z = {
			{ "diagnostics", separator = { right = "", left = "" }, left_padding = 2 },
		},
	},
	inactive_sections = {
		lualine_a = {},
		lualine_b = {},
		lualine_c = {},
		lualine_x = {},
		lualine_y = {},
		lualine_z = {},
	},
})
