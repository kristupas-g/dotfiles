vim.opt.tabstop = 4
vim.opt.shiftwidth = 2
vim.opt.softtabstop = 0
vim.opt.expandtab = false
vim.opt.textwidth = 120
vim.opt.conceallevel = 2

vim.keymap.set('n', '<leader>t', function()

  Tmux_split("go test ./...")
end, { noremap = true, silent = true })
