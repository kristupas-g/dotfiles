local M = {}

local local_file_name = ".locals.lua"

M.source_lua_locals = function()
	if vim.fn.filereadable("./" .. local_file_name) == 1 then
		vim.cmd("source " .. local_file_name)
	end
end

M.init = function()
	Run_cmd = ""
	Test_cmd = ""
end

return M
