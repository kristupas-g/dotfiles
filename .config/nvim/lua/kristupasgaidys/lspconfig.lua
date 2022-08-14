require("mason").setup()
require("mason-lspconfig").setup()
local lsp = require("lspconfig")
local capabilities = require("cmp_nvim_lsp").update_capabilities(vim.lsp.protocol.make_client_capabilities())

local servers = { "bashls", "gopls", "clangd", "rust_analyzer", "omnisharp" }

for _, server in pairs(servers) do
	lsp[server].setup({
		capabilities = capabilities,
		on_attach = Lsp_base_bindings,
	})
end

require("kristupasgaidys.lsp.json")
require("kristupasgaidys.lsp.sumneko")
require("kristupasgaidys.lsp.typescript")

vim.diagnostic.config({
	virtual_text = true,
	underline = false,
	signs = false,
	severity_sort = true,
})

vim.lsp.handlers["textDocument/hover"] = vim.lsp.with(vim.lsp.handlers.hover, { border = "rounded" })
vim.lsp.handlers["textDocument/signatureHelp"] = vim.lsp.with(vim.lsp.handlers.signature_help, { border = "rounded" })
vim.diagnostic._set_virtual_text = vim.lsp.with(vim.diagnostic._set_virtual_text, {})
