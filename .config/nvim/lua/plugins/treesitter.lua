local languages = {
	"c",
	"c_sharp",
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
	"java",
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
