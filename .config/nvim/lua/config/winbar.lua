-- if require("nvim-navic").is_available() then
vim.o.winbar = "%{%v:lua.require'nvim-navic'.get_location()%}"
-- end
