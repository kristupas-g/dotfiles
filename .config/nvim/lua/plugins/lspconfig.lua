local servers = {
	"jdtls",
	"bashls",
	"gopls",
	"clangd",
	"rust_analyzer",
	"omnisharp",
	"pyright",
	"texlab",
	"jsonls",
	"tsserver",
	"marksman",
}

return {
	"neovim/nvim-lspconfig",
	dependencies = {
		"nvim-lua/plenary.nvim",
		{ "williamboman/mason.nvim", config = true },
		{ "williamboman/mason-lspconfig.nvim", opts = { ensure_installed = servers } },
	},
	config = function()
		local capabilities = require("cmp_nvim_lsp").default_capabilities()

		local lsp = require("lspconfig")

		for _, server in pairs(servers) do
			lsp[server].setup({
				capabilities = capabilities,
				on_attach = Lsp_base_bindings,
			})
		end

		require("plugins.lsp_servers.lua_ls")

		vim.diagnostic.config({
			virtual_text = true,
			underline = false,
			signs = false,
			severity_sort = true,
		})

		local handlers = vim.lsp.handlers

		handlers["textDocument/hover"] = vim.lsp.with(vim.lsp.handlers.hover, { border = "rounded" })
		handlers["textDocument/signatureHelp"] = vim.lsp.with(handlers.signature_help, { border = "rounded" })
		vim.diagnostic._set_virtual_text = vim.lsp.with(vim.diagnostic._set_virtual_text, {})
	end,
}
