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
				vim.lsp.buf.formatting_sync()
			end,
			group = augroup,
		})
	end,
})
