local lua_locals = require("kristupasgaidys.lua_locals")

local api = vim.api

local yank_group = api.nvim_create_augroup("YankHighlight", { clear = true })

api.nvim_create_autocmd("TextYankPost", {
	command = "silent! lua vim.highlight.on_yank()",
	group = yank_group,
})

local on_vim_enter_group = api.nvim_create_augroup("Locals", { clear = true })

api.nvim_create_autocmd("VimEnter", { callback = lua_locals.source_lua_locals })
