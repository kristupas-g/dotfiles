return {
	"kristupas-g/harpoon",
	enabled = false,
	name = "harp",
	config = function()
		local harpoon = require("harpoon.ui")
		local keymap_set = vim.keymap.set

		keymap_set("n", "mm", harpoon.toggle_quick_menu, { silent = true, desc = "Harpoon menu" })
		keymap_set("n", "M", require("harpoon.mark").add_file, { silent = true, desc = "Harpoon file" })
		keymap_set("n", "<leader>rm", require("harpoon.cmd-ui").toggle_quick_menu)

		local keymap_settings = { silent = true, desc = "" }

		keymap_set("n", "ma", function()
			harpoon.nav_file(1)
		end, keymap_settings)
		keymap_set("n", "ms", function()
			harpoon.nav_file(2)
		end, keymap_settings)
		keymap_set("n", "md", function()
			harpoon.nav_file(3)
		end, keymap_settings)
		keymap_set("n", "mf", function()
			harpoon.nav_file(4)
		end, keymap_settings)
	end,
}
