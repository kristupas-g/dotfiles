return {
	"jose-elias-alvarez/null-ls.nvim",
	dependencies = {
		{ "nvim-lua/plenary.nvim" },
		{
			"jay-babu/mason-null-ls.nvim",
			opts = {
				ensure_installed = {
					"stylua",
					"prettierd",
					"black",
					"eslint",
					"flake8",
					"csharpier",
				},
			},
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
				format.csharpier,
				diagnostics.eslint,
				diagnostics.flake8,
			},
			diagnostics_format = "#{m}",
			on_attach = function(_, bufnr)
				local augroup = vim.api.nvim_create_augroup("Formatting", { clear = true })

				vim.api.nvim_create_autocmd({ "BufWritePre" }, {
					callback = function()
						vim.lsp.buf.format({ bufnr = bufnr })
					end,
					group = augroup,
				})
			end,
		})
	end,
}
