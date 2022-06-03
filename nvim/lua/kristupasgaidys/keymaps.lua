local normal = function(keymap, command)
	vim.keymap.set("n", keymap, command, { silent = true })
end

vim.cmd('let g:mapleader = "\\<Space>"') -- TODO DELETE AND FIX
normal("<leader>1", ':lua print("hello")<cr>')

vim.keymap.set("i", "jk", "<esc>")
normal("<leader>fs", ":update<cr>")
normal("noh", ":noh<cr>")
normal("<leader>w", "<C-w>")

normal("<leader><leader>", require("telescope.builtin").find_files)
normal("<leader>h", require("telescope.builtin").help_tags)

normal("<leader>ft", ":NvimTreeToggle<cr>")

-- Git
normal("<leader>gg", require("neogit").open)
normal("<leader>gd", ":DiffviewOpen<cr>")
normal("<leader>gh", ":DiffviewFileHistory<cr>")
normal("<leader>gt", require("telescope").extensions.git_worktree.git_worktrees)
normal("<leader>gc", require("telescope").extensions.git_worktree.create_git_worktree)
-- Git conflict
normal("<leader>co", "<Plug>(git-conflict-ours)")
normal("<leader>ct", "<Plug>(git-conflict-theirs)")
normal("<leader>cb", "<Plug>(git-conflict-both)")
normal("<leader>c0", "<Plug>(git-conflict-none)")
normal("<leader>cn", "<Plug>(git-conflict-prev-conflict)")
normal("<leader>cp", "<Plug>(git-conflict-next-conflict)")

-- Bufferline keybindings
normal("<leader>bp", ":BufferLinePick<cr>")
normal("<leader>bmj", ":BufferLineMovePrev<cr>")
normal("<leader>bmk", ":BufferLineMoveNext<cr>")
normal("<leader>bcr", ":BufferLineCloseRight<cr>")
normal("<leader>bcl", ":BufferLineCloseLeft<cr>")
normal("<leader>j", ":BufferLineCyclePrev<cr>")
normal("<leader>k", ":BufferLineCycleNext<cr>")

Lsp_base_bindings = function(client, bufnr)
	local opts = { noremap = true, silent = true }

	vim.api.nvim_buf_set_keymap(bufnr, "n", "gd", "<cmd>lua vim.lsp.buf.definition()<CR>", opts)
	vim.api.nvim_buf_set_keymap(bufnr, "n", "<leader>ch", "<cmd>lua vim.lsp.buf.hover()<CR>", opts)
	vim.api.nvim_buf_set_keymap(bufnr, "n", "<leader>cs", "<cmd>lua vim.lsp.buf.signature_help()<CR>", opts)
	vim.api.nvim_buf_set_keymap(bufnr, "n", "<leader>ct", "<cmd>lua vim.lsp.buf.type_definition()<CR>", opts)
	vim.api.nvim_buf_set_keymap(bufnr, "n", "<leader>cR", "<cmd>lua vim.lsp.buf.rename()<CR>", opts)
	vim.api.nvim_buf_set_keymap(bufnr, "n", "<leader>ca", "<cmd>lua vim.lsp.buf.code_action()<CR>", opts)
	vim.api.nvim_buf_set_keymap(bufnr, "n", "<leader>cE", "<cmd>Trouble<CR>", opts)
	vim.api.nvim_buf_set_keymap(bufnr, "n", "<leader>cf", '<cmd>lua require("telescope.builtin").live_grep()<CR>', opts)
	vim.api.nvim_buf_set_keymap(
		bufnr,
		"n",
		"<leader>cr",
		'<cmd>lua require("telescope.builtin").lsp_references()<CR>, ',
		opts
	)
	vim.api.nvim_buf_set_keymap(
		bufnr,
		"n",
		"<leader>ci",
		'<cmd>lua require("telescope.builtin").lsp_implementations()<CR>',
		opts
	)
end
