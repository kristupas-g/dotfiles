local normal = function(keymap, command, label)
	local opts = { silent = true, desc = label }
	vim.keymap.set("n", keymap, command, opts)
end

vim.keymap.set("i", "jk", "<esc>")
normal("<leader>fs", ":update<cr>", "Save file")
normal("noh", ":noh<cr>", "Remove search highlight")
normal("<leader>w", "<C-w>", "Windows")

normal("<leader><leader>", require("telescope.builtin").find_files, "Find files")
normal("<leader>h", require("telescope.builtin").help_tags, "Help")

normal("<leader>ft", ":NvimTreeToggle<cr>", "File tree")

normal("<leader>tt", ":TransparentToggle<cr>", "Toggle transperancy")
normal("<leader>ti", ":IndentBlanklineToggle<cr>", "Toggle indent lines")

-- Git
normal("<leader>gg", require("neogit").open, "Git")
normal("<leader>gd", ":DiffviewOpen<cr>", "Diff")
normal("<leader>gh", ":DiffviewFileHistory<cr>", "Current file history")
normal("<leader>gw", require("telescope").extensions.git_worktree.git_worktrees, "Switch worktree")
normal("<leader>gc", require("telescope").extensions.git_worktree.create_git_worktree, "Create worktree")
-- Git conflict
normal("<leader>go", "<Plug>(git-conflict-ours)", "Take ours")
normal("<leader>gt", "<Plug>(git-conflict-theirs)", "Take theirs")
normal("<leader>gb", "<Plug>(git-conflict-both)", "Take both")
normal("<leader>g0", "<Plug>(git-conflict-none)", "Take none")
normal("<leader>gn", "<Plug>(git-conflict-prev-conflict)", "Go to previous conflict")
normal("<leader>gp", "<Plug>(git-conflict-next-conflict)", "Go to next conflict")

-- Bufferline keybindings
normal("<leader>bb", ":BufferLinePick<cr>", "Choose buffer")
normal("<leader>bj", ":BufferLineMovePrev<cr>", "Move buffer left")
normal("<leader>bk", ":BufferLineMoveNext<cr>", "Move buffer right")
normal("<leader>bcr", ":BufferLineCloseRight<cr>", "Close all buffers to the right")
normal("<leader>bcl", ":BufferLineCloseLeft<cr>", "Close all buffers to the left")
normal("<leader>j", ":BufferLineCyclePrev<cr>", "Go to previous buffer")
normal("<leader>k", ":BufferLineCycleNext<cr>", "Go to next buffer")

Lsp_base_bindings = function(client, bufnr)
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
	lsp_bind("<leader>cE", "<cmd>Trouble<CR>", "All errors")
	lsp_bind("<leader>cf", require("telescope.builtin").live_grep, "Search code")
	lsp_bind("<leader>cr", require("telescope.builtin").lsp_references, "Show references")
	lsp_bind("<leader>ci", require("telescope.builtin").lsp_implementations, "Show implementations")
end

require("which-key").register({
	f = { name = "File" },
	g = { name = "Git" },
	c = { name = "Code" },
	t = { name = "Toggle" },
	b = { name = "Buffer", c = { "Close" } },
	o = { name = "Org", a = { "Agenda" }, c = { "Capture" } },
}, { prefix = "<leader>" })
