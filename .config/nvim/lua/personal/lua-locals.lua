local settings = {
	file_name = ".locals.lua",
}

local function source_lua_locals()
	if vim.fn.filereadable("./" .. settings.file_name) == 1 then
		vim.cmd("source " .. settings.file_name)
	end
end

local function make_autocmd()
	local augroup = vim.api.nvim_create_autgroup("OnEnter", {})
	vim.api.nvim_create_autocmd("VimEnter", { callback = source_lua_locals, group = augroup })
end

local M = {}

M.setup = function(opts)
	opts = opts or {}
	settings = vim.tbl_extend("force", settings, opts)
	make_autocmd()
end

return M
