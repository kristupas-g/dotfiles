require("kristupasgaidys.lsp-installer")
local lsp = require("lspconfig")
local capabilities = require("cmp_nvim_lsp").update_capabilities(vim.lsp.protocol.make_client_capabilities())
local servers = { "cssls", "bashls", "jdtls", "sqlls", "gopls", "clangd" }

vim.diagnostic.config({
	virtual_text = true,
	virtual_lines = false,
	underline = false,
	signs = false,
	severity_sort = true,
})

vim.lsp.handlers["textDocument/hover"] = vim.lsp.with(vim.lsp.handlers.hover, { border = "rounded" })
vim.lsp.handlers["textDocument/signatureHelp"] = vim.lsp.with(vim.lsp.handlers.signature_help, { border = "rounded" })

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

-- function PrintDiagnostics(opts, bufnr, line_nr, client_id)
-- 	bufnr = bufnr or 0
-- 	line_nr = line_nr or (vim.api.nvim_win_get_cursor(0)[1] - 1)
-- 	opts = opts or { ["lnum"] = line_nr }

-- 	local line_diagnostics = vim.diagnostic.get(bufnr, opts)
-- 	if vim.tbl_isempty(line_diagnostics) then
-- 		return
-- 	end

-- 	local diagnostic_message = ""
-- 	for i, diagnostic in ipairs(line_diagnostics) do
-- 		diagnostic_message = diagnostic_message .. string.format("%d: %s", i, diagnostic.message or "")
-- 		print(diagnostic_message)
-- 		if i ~= #line_diagnostics then
-- 			diagnostic_message = diagnostic_message .. "\n"
-- 		end
-- 	end
-- 	vim.api.nvim_echo({ { diagnostic_message, "Normal" } }, false, {})
-- end

-- You will likely want to reduce updatetime which affects CursorHold
-- note: this setting is global and should be set only once
-- vim.o.updatetime = 250
-- vim.cmd([[autocmd! CursorHold,CursorHoldI * lua vim.diagnostic.open_float(nil, {focus=false})]])

-- vim.cmd([[ autocmd! CursorHold * lua PrintDiagnostics() ]])
