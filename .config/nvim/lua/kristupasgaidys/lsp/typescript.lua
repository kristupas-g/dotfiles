local capabilities = require("cmp_nvim_lsp").update_capabilities(vim.lsp.protocol.make_client_capabilities())
local lsp = require("lspconfig")
local ts_utils = require("nvim-lsp-ts-utils")

ts_utils.setup({
	enable_import_on_completion = true,
	auto_inlay_hints = false,
	complete_parens = false,
	signature_help_in_parens = true,
	update_imports_on_move = true,
	require_confirmation_on_move = false,
	filter_out_diagnostics_by_severity = { "hint" },
})

lsp.tsserver.setup({
	capabilities = capabilities,
	on_attach = function(client, bufnr)
		ts_utils.setup_client(client)
		Lsp_base_bindings(client, bufnr)
		client.resolved_capabilities.document_formatting = false
		client.resolved_capabilities.document_range_formatting = false
	end,
})
