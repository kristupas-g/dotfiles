vim.api.nvim_create_autocmd({ "BufWritePre" }, {
	pattern = { "*.ts", "*.tsx", "*js", "*.jsx", "*.json" },
	command = "PrettierAsync",
})

vim.api.nvim_create_autocmd({ "BufWritePre" }, {
	pattern = { "*.cs" },
	command = "lua vim.lsp.buf.formatting_sync()",
})

vim.api.nvim_create_autocmd({ "BufWritePre" }, {
	pattern = { "*.lua" },
	command = 'lua require("stylua-nvim").format_file()',
})
