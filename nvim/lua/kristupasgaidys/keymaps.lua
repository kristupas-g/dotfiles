local normal = function(keymap, command)
	vim.keymap.set("n", keymap, command, { silent = true })
end

vim.cmd('let g:mapleader = "\\<Space>"') -- TODO DELETE AND FIX
normal("<leader>1", ':lua print("hello")<cr>')

-- Vim bindings
vim.keymap.set("i", "jk", "<esc>")
normal("<leader>fs", ":update<cr>")
normal("noh", ":noh<cr>")
normal("<leader>w", "<C-w>")

normal("<leader><leader>", require("telescope.builtin").find_files)

-- Bufferline keybindings
normal("<leader>bp", ":BufferLinePick<cr>")
normal("<leader>bmj", ":BufferLineMovePrev<cr>")
normal("<leader>bmk", ":BufferLineMoveNext<cr>")
normal("<leader>bcr", ":BufferLineCloseRight<cr>")
normal("<leader>bcl", ":BufferLineCloseLeft<cr>")
normal("<leader>j", ":BufferLineCyclePrev<cr>")
normal("<leader>k", ":BufferLineCycleNext<cr>")

-- Lsp keybindings
normal("<leader>ft", ":NvimTreeToggle<cr>")
normal("<leader>cf", require("telescope.builtin").live_grep)
normal("<leader>cE", ":Trouble<cr>") -- Move this to lsp
lsp_base_bindings = function(client, bufnr)
	--vim.api.nvim_buf_set_keymap(bufnr, 'n', 'gd', '<cmd>lua vim.lsp.buf.definition()<CR>', opts)
	vim.api.nvim_buf_set_keymap(bufnr, "n", "gd", vim.lsp.buf.definition, opts)
	vim.api.nvim_buf_set_keymap(bufnr, "n", "<leader>ch", "<cmd>lua vim.lsp.buf.hover()<CR>", opts)
	vim.api.nvim_buf_set_keymap(bufnr, "n", "<leader>ci", "<cmd>lua vim.lsp.buf.implementation()<CR>", opts)
	vim.api.nvim_buf_set_keymap(bufnr, "n", "<leader>cs", "<cmd>lua vim.lsp.buf.signature_help()<CR>", opts)
	vim.api.nvim_buf_set_keymap(bufnr, "n", "<leader>ct", "<cmd>lua vim.lsp.buf.type_definition()<CR>", opts)
	vim.api.nvim_buf_set_keymap(bufnr, "n", "<leader>cr", "<cmd>lua vim.lsp.buf.rename()<CR>", opts)
	vim.api.nvim_buf_set_keymap(bufnr, "n", "<leader>ca", "<cmd>lua vim.lsp.buf.code_action()<CR>", opts)
	vim.api.nvim_buf_set_keymap(bufnr, "n", "<leader>cr", "<cmd>lua vim.lsp.buf.references()<CR>", opts)
end
