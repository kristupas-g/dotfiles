return {
	"ThePrimeagen/harpoon",
	config = function()
		vim.keymap.set("n", "mm", require("harpoon.ui").toggle_quick_menu, { silent = true, desc = "Harpoon menu" })
		vim.keymap.set("n", "M", require("harpoon.mark").add_file, { silent = true, desc = "Harpoon file" })

		vim.keymap.set("n", "ma", function()
			require("harpoon.ui").nav_file(1)
		end, { silent = true, desc = "" })
		vim.keymap.set("n", "ms", function()
			require("harpoon.ui").nav_file(2)
		end, { silent = true, desc = "" })
		vim.keymap.set("n", "md", function()
			require("harpoon.ui").nav_file(3)
		end, { silent = true, desc = "" })
		vim.keymap.set("n", "mf", function()
			require("harpoon.ui").nav_file(4)
		end, { silent = true, desc = "" })
	end,
}
