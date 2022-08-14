local null_ls = require("null-ls")

null_ls.setup({
	sources = {
		null_ls.builtins.formatting.stylua,
		null_ls.builtins.formatting.prettierd,

		null_ls.builtins.diagnostics.eslint_d,
		null_ls.builtins.diagnostics.editorconfig_checker,
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
