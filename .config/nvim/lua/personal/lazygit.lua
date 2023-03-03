local M = {}

M.open = function()
	vim.cmd.terminal("lazygit")
	vim.cmd.startinsert()

	local bufnr = vim.api.nvim_get_current_buf()

	vim.keymap.set("t", "q", function()
		vim.cmd("bdelete!")
		-- Doesnt go back
		vim.opt.laststatus = 3
	end, { buffer = bufnr })

	vim.opt_local.relativenumber = false
	vim.opt_local.number = false
	vim.opt_local.laststatus = 0
end

return M
