local capabilities = require("cmp_nvim_lsp").update_capabilities(vim.lsp.protocol.make_client_capabilities())

require("lspconfig").sumneko_lua.setup({
	on_attach = function(client, bufnr)
		client.resolved_capabilities.document_formatting = false
		client.resolved_capabilities.document_range_formatting = false
		Lsp_base_bindings(client, bufnr)
	end,
	capabilities = capabilities,
	settings = {
		Lua = {
			completion = { enable = true, showWord = "Disable" },
			runtime = { version = "LuaJIT" },
			workspace = { library = { os.getenv("VIMRUNTIME") } },
			telemetry = { enable = false },
			globals = { "vim" },
		},
	},
})
