return {
	"folke/which-key.nvim",
	opts = {
		{
			plugins = {
				marks = false,
				registers = false,
				presets = {
					operators = true,
					motions = true,
					text_objects = true,
					windows = false,
					nav = true,
					z = false,
					g = true,
				},
			},
			key_labels = {
				["<cr>"] = "ENTER",
				["<space>"] = "SPC",
			},
			icons = {
				breadcrumb = "▶",
				group = " ",
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
		},
	},
	config = function()
		local which_key = require("which-key")

		which_key.register({
			["<leader>"] = {
				w = {
					name = "Window",
					s = { "Split window" },
					v = { "Split window vertically" },
					w = { "Switch windows" },
					q = { "Quit a window" },
					T = { "Break out into a new tab" },
					x = { "Swap current with next" },
					["-"] = { "Decrease height" },
					["+"] = { "Increase height" },
					["<lt>"] = { "Decrease width" },
					[">"] = { "Increase width" },
					["|"] = { "Max out the width" },
					["="] = { "Equally high and wide" },
					h = { "Go to the left window" },
					l = { "Go to the right window" },
					k = { "Go to the up window" },
					j = { "Go to the down window" },
				},
			},
		})

		which_key.register({
			f = { name = "File" },
			g = { name = "Git" },
			c = { name = "Code" },
			e = { name = "Error" },
			p = { name = "Project" },
			t = { name = "Toggle" },
			b = { name = "Buffer", c = { "Close" } },
		}, { prefix = "<leader>" })
	end,
}
