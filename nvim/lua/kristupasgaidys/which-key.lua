require("which-key").setup({
	plugins = {
		marks = false,
		registers = false,
		presets = {
			operators = false,
			motions = false,
			text_objects = false,
			windows = true,
			nav = false,
			z = false,
			g = false,
		},
	},
	operators = { gc = "Comments" },
	key_labels = {
		["<cr>"] = "ENTER",
	},
	window = {
		margin = { 1, 3, 2, 1 },
		padding = { 1, 1, 1, 1 },
	},
	layout = {
		height = { min = 4, max = 25 },
		width = { min = 20, max = 50 },
		align = "center",
	},
	ignore_missing = false,
	show_help = true,
	triggers = "auto",
})
