local normal = function(keymap, command, label)
	vim.keymap.set("n", keymap, command, { silent = true, desc = label })
end

vim.cmd('let g:mapleader = "\\<Space>"') -- TODO DELETE AND FIX
normal("<leader>1", ':lua print("hello")<cr>')

vim.keymap.set("i", "jk", "<esc>")
normal("<leader>fs", ":update<cr>", "Save file")
normal("noh", ":noh<cr>", "Remove search highlight")
normal("<leader>w", "<C-w>", "Windows")

normal("<leader><leader>", require("telescope.builtin").find_files, "Find files")
normal("<leader>h", require("telescope.builtin").help_tags, "Help")

normal("<leader>ft", ":NvimTreeToggle<cr>", "File tree")

-- Git
normal("<leader>gg", require("neogit").open, "Git")
normal("<leader>gd", ":DiffviewOpen<cr>", "Diff")
normal("<leader>gh", ":DiffviewFileHistory<cr>", "Current file history")
normal("<leader>gt", require("telescope").extensions.git_worktree.git_worktrees, "Switch worktree")
normal("<leader>gc", require("telescope").extensions.git_worktree.create_git_worktree, "Create worktree")
-- Git conflict
normal("<leader>go", "<Plug>(git-conflict-ours)", "Take ours")
normal("<leader>gt", "<Plug>(git-conflict-theirs)", "Take theirs")
normal("<leader>gb", "<Plug>(git-conflict-both)", "Take both")
normal("<leader>g0", "<Plug>(git-conflict-none)", "Take none")
normal("<leader>gn", "<Plug>(git-conflict-prev-conflict)", "Go to previous conflict")
normal("<leader>gp", "<Plug>(git-conflict-next-conflict)", "Go to next conflict")

-- Bufferline keybindings
normal("<leader>bp", ":BufferLinePick<cr>", "Choose buffer")
normal("<leader>bj", ":BufferLineMovePrev<cr>", "Move buffer left")
normal("<leader>bk", ":BufferLineMoveNext<cr>", "Move buffer right")
normal("<leader>bcr", ":BufferLineCloseRight<cr>", "Close all buffers to the right")
normal("<leader>bcl", ":BufferLineCloseLeft<cr>", "Close all buffers to the left")
normal("<leader>j", ":BufferLineCyclePrev<cr>", "Go to previous buffer")
normal("<leader>k", ":BufferLineCycleNext<cr>", "Go to next buffer")

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
