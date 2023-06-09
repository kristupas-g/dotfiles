local capabilities = require("cmp_nvim_lsp").default_capabilities()

require("lspconfig").solargraph.setup({
	capabilities = capabilities,
	on_attach = Lsp_base_bindings,
	settings = {
		solargraph = {
			useBundler = true,
			diagnostic = true,
			completion = true,
			hover = true,
			symbols = true,
			definitions = true,
			rename = true,
			references = true,
		},
	},
})
