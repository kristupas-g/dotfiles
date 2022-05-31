local capabilities = require("cmp_nvim_lsp").update_capabilities(vim.lsp.protocol.make_client_capabilities())

require("lspconfig").omnisharp.setup({
	capabilities = capabilities,
	on_attach = function(client, bufnr)
		lsp_base_bindings(client, bufnr)
		-- Add autocommand to format with editor config
	end,
})
