local capabilities = require("cmp_nvim_lsp").update_capabilities(vim.lsp.protocol.make_client_capabilities())

require("lspconfig").jsonls.setup({
	on_attach = lsp_base_bindings,
	capabilities = capabilities,
	settings = {
		json = {
			schemas = {
				{
					fileMatch = { "package.json" },
					url = "https://json.schemastore.org/package.json",
				},
				{
					fileMatch = { "tsconfig.json", "tsconfig.*.json" },
					url = "http://json.schemastore.org/tsconfig",
				},
				{
					fileMatch = { ".eslintrc.json", ".eslintrc" },
					url = "http://json.schemastore.org/eslintrc",
				},
				{
					fileMatch = { ".prettierrc", ".prettierrc.json", "prettier.config.json" },
					url = "http://json.schemastore.org/prettierrc",
				},
				{
					fileMatch = { "deno.json" },
					url = "https://raw.githubusercontent.com/denoland/deno/main/cli/schemas/config-file.v1.json",
				},
			},
		},
	},
})
