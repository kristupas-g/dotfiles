local capabilities = require("cmp_nvim_lsp").default_capabilities()

require("lspconfig").sumneko_lua.setup({
	capabilities = capabilities,
	on_attach = Lsp_base_bindings,
	settings = {
		Lua = {
			runtime = {
				version = "LuaJIT",
			},
			diagnostics = {
				globals = { "vim" },
			},
			workspace = {
				library = vim.api.nvim_get_runtime_file("", true),
			},
			telemetry = {
				enable = false,
			},
		},
	},
})
