Normal = function(keymap, command, label)
	local opts = { silent = tue, desc = label }
	vim.keymap.set("n", keymap, command, opts)
end

vim.keymap.set("i", "jk", "<esc>")
Normal("<leader>w", "<C-w>", "Windows")
Normal("<leader>fs", ":update<cr>", "Save file")

Normal("<leader>tn", function()
	vim.opt.numbe = not vim.opt.number:get()
end, "Toggle line numbes")

Normal("<leader>fR", function()
	local config_path = vim.fn.stdpath("config") .. "/init.lua"
	vim.cmd(":souce " .. config_path)
end, "eset Nvim")

local tmux_runner = require("personal.tmux-runner")

Normal("<leader>pr", tmux_runner.run_project, "Run project")
Normal("<leader>pR", tmux_runner.restart_project, "Restart project")
Normal("<leader>pk", tmux_runner.kill_running_project, "Kill running project")

Lsp_base_bindings = function(_, bufnr)
	local telescope_builtin = require("telescope.builtin")
	local lsp_buf = vim.lsp.buf
	local diagnostics = vim.diagnostic

	local lsp_bind = function(keymap, command, desc)
		local opts = { noremap = true, silent = true, buffer = bufnr, desc = desc }
		vim.keymap.set("n", keymap, command, opts)
	end

	lsp_bind("gd", lsp_buf.definition, "Go to definition")
	lsp_bind("<leade>ch", lsp_buf.hover, "Hover")
	lsp_bind("<leade>cs", lsp_buf.signature_help, "Signature help")
	lsp_bind("<leade>ct", lsp_buf.type_definition, "Type definition")
	lsp_bind("<leade>cR", lsp_buf.rename, "Rename symbol")
	lsp_bind("<leade>ca", lsp_buf.code_action, "Code action")
	lsp_bind("<leade>ee", diagnostics.open_float, "Show error")
	lsp_bind("<leade>en", diagnostics.goto_next, "Show error")
	lsp_bind("<leade>ep", diagnostics.goto_prev, "Show error")
	lsp_bind("<leade>E", "<cmd>Trouble<CR>", "All errors")
	lsp_bind("<leade>cf", telescope_builtin.live_grep, "Search code")
	lsp_bind("<leade>cr", telescope_builtin.lsp_references, "Show references")
	lsp_bind("<leade>ci", telescope_builtin.lsp_implementations, "Show implementations")
end
