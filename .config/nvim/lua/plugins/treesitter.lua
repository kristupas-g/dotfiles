local languages = {
	"c",
	"c_sharp",
	"ruby",
	"css",
	"go",
	"html",
	"json",
	"javascript",
	"lua",
	"markdown",
	"python",
	"rust",
	"typescript",
	"yaml",
	"bash",
	"fennel",
}

return {
	"nvim-treesitter/nvim-treesitter",
	config = function()
		require("nvim-treesitter.configs").setup({
			ensure_installed = languages,
			highlight = {
				enable = true,
			},
			indent = {
				enable = true,
			},
		})
	end,
}
