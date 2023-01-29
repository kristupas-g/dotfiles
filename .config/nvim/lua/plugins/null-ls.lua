return {
	"jose-elias-alvarez/null-ls.nvim",
	dependencies = {
		{ "nvim-lua/plenary.nvim" },
		{
			"jay-babu/mason-null-ls.nvim",
			opts = { ensure_installed = { "stylua", "prettierd", "black", "eslint", "flake8", "editorconfig_checker" } },
		},
	},
	config = function()
		local null_ls = require("null-ls")
		local format = null_ls.builtins.formatting
		local diagnostics = null_ls.builtins.diagnostics

		null_ls.setup({
			sources = {
				format.stylua,
				format.prettierd,
				format.black,
				diagnostics.eslint,
				diagnostics.flake8,
				diagnostics.editorconfig_checker,
			},

			diagnostics_format = "#{m}",

			on_init = function()
				local augroup = vim.api.nvim_create_augroup("Formatting", { clear = true })

				vim.api.nvim_create_autocmd({ "BufWritePre" }, {
					callback = function()
						vim.lsp.buf.format()
					end,
					group = augroup,
				})
			end,
		})
	end,
}
