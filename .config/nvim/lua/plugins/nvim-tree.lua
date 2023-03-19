return {
	"nvim-tree/nvim-tree.lua",
	config = function()
		require("nvim-tree").setup()
		Normal("<leader>ft", ":NvimTreeOpen<cr>")
	end,
}
