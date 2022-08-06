Normal = function(keymap, command, label)
	local opts = { silent = true, desc = label }
	vim.keymap.set("n", keymap, command, opts)
end

vim.keymap.set("i", "jk", "<esc>")

Normal("<leader>w", "<C-w>", "Windows")
Normal("<leader>fs", ":update<cr>", "Save file")

Normal("<leader>tn", function()
	vim.opt.number = not vim.opt.number:get()
end, "Toggle line numbers")

Normal("<leader>fr", function()
	vim.cmd(":so %")
end, "Source file")

Lsp_base_bindings = function(_, bufnr)
	local lsp_bind = function(keymap, command, desc)
		local opts = { noremap = true, silent = true, buffer = bufnr, desc = desc }
		vim.keymap.set("n", keymap, command, opts)
	end
	lsp_bind("gd", vim.lsp.buf.definition, "Go to definition")
	lsp_bind("<leader>ch", vim.lsp.buf.hover, "Hover")
	lsp_bind("<leader>cs", vim.lsp.buf.signature_help, "Signature help")
	lsp_bind("<leader>ct", vim.lsp.buf.type_definition, "Type definition")
	lsp_bind("<leader>cR", vim.lsp.buf.rename, "Rename symbol")
	lsp_bind("<leader>ca", vim.lsp.buf.code_action, "Code action")
	lsp_bind("<leader>ee", vim.diagnostic.open_float, "Show error")
	lsp_bind("<leader>en", vim.diagnostic.goto_next, "Show error")
	lsp_bind("<leader>ep", vim.diagnostic.goto_prev, "Show error")
	lsp_bind("<leader>E", "<cmd>Trouble<CR>", "All errors")
	lsp_bind("<leader>cf", require("telescope.builtin").live_grep, "Search code")
	lsp_bind("<leader>cr", require("telescope.builtin").lsp_references, "Show references")
	lsp_bind("<leader>ci", require("telescope.builtin").lsp_implementations, "Show implementations")
end
