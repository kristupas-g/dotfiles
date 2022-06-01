local lsp = require("lspconfig")
local capabilities = require("cmp_nvim_lsp").update_capabilities(vim.lsp.protocol.make_client_capabilities())
local servers = { "cssls", "bashls", "jdtls", "sqlls", "gopls", "clangd", "eslint" }

vim.diagnostic.config({
	virtual_text = true,
	underline = false,
	signs = false,
})

for _, server in pairs(servers) do
	lsp[server].setup({
		capabilities = capabilities,
		on_attach = Lsp_base_bindings,
	})
end

require("kristupasgaidys.lsp.json")
require("kristupasgaidys.lsp.omnisharp")
require("kristupasgaidys.lsp.sumneko")
require("kristupasgaidys.lsp.typescript")
require("kristupasgaidys.lsp.autocmds")
