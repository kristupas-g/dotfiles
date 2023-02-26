local api = vim.api

local yank_group = api.nvim_create_augroup("YankHighlight", {})

api.nvim_create_autocmd("TextYankPost", {
	command = "silent! lua vim.highlight.on_yank()",
	group = yank_group,
})
