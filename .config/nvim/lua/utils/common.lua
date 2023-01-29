local M = {}

M.get_project_name = function()
	local cwd = vim.fn.getcwd()
	local split_cwd = vim.fn.split(cwd, "/")
	local element_count = vim.tbl_count(split_cwd)

	--Return last element of cwd
	return split_cwd[element_count]
end

return M
