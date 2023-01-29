return {
	"williamboman/mason.nvim",
	dependencies = {
		"jose-elias-alvarez/nvim-lsp-ts-utils",
		"nvim-lua/plenary.nvim",
		"williamboman/mason-lspconfig.nvim",
		"neovim/nvim-lspconfig",
	},
	config = function()
		require("mason").setup()
		require("mason-lspconfig").setup()

		local lsp = require("lspconfig")
		local capabilities = require("cmp_nvim_lsp").default_capabilities()

		local servers = { "bashls", "gopls", "clangd", "rust_analyzer", "omnisharp", "pyright", "texlab", "jsonls" }

		for _, server in pairs(servers) do
			lsp[server].setup({
				capabilities = capabilities,
				on_attach = Lsp_base_bindings,
			})
		end
		require("plugins.lsp-servers.sumneko")

		vim.diagnostic.config({
			virtual_text = true,
			underline = false,
			signs = false,
			severity_sort = true,
		})

		vim.lsp.handlers["textDocument/hover"] = vim.lsp.with(vim.lsp.handlers.hover, { border = "rounded" })
		vim.lsp.handlers["textDocument/signatureHelp"] = vim.lsp.with(vim.lsp.handlers.signature_help, { border = "rounded" })
		vim.diagnostic._set_virtual_text = vim.lsp.with(vim.diagnostic._set_virtual_text, {})
	end,
}
