local mode = "%-5{%v:lua.string.upper(v:lua.vim.fn.mode())%}"
local file_name = "%-.16t"
local modified = " %-m"
local right_align = "%="
local line_no = "%10([%l/%L%)]"

-- local git_branch = function()
-- 	return vim.fn.systemlist({ "git", "branch", "--show-current" }, {})
-- end

-- vim.pretty_print(git_branch())

vim.opt.statusline = string.format("%s%s%s%s%s", mode, file_name, modified, right_align, line_no)
