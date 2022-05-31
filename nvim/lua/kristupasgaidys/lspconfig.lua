local lsp = require("lspconfig")
local capabilities = require("cmp_nvim_lsp").update_capabilities(vim.lsp.protocol.make_client_capabilities())

vim.diagnostic.config({
	virtual_text = true,
	underline = false,
	signs = false,
})

lsp.sumneko_lua.setup({})
lsp.cssls.setup({})
lsp.bashls.setup({})
lsp.jdtls.setup({})
lsp.sqlls.setup({})
lsp.gopls.setup({})
lsp.clangd.setup({})



lsp.jsonls.setup({
	on_attach = on_attach,
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
