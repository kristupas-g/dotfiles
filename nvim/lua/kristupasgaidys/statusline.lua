local mode = "%-5{%v:lua.string.upper(v:lua.vim.fn.mode())%}"
local file_name = "%-.16t"
local modified = " %-m"
local right_align = "%="
local line_no = "%10([%l/%L%)]"

vim.opt.statusline = string.format("%s%s%s%s%s", mode, file_name, modified, right_align, line_no)
