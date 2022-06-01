local capabilities = require("cmp_nvim_lsp").update_capabilities(vim.lsp.protocol.make_client_capabilities())

require("lspconfig").sumneko_lua.setup({
	on_attach = function(client, bufnr)
		Lsp_base_bindings(client, bufnr)
		-- autocommand to format with stylua
	end,
	capabilities = capabilities,
	settings = {
		Lua = {
			diagnostics = {
				globals = { "vim" },
			},
		},
	},
})
