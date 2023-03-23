require("config.lsp_keybinds")
require("config.git_keybinds")

vim.keymap.set("i", "jk", "<esc>")

Normal("<leader>w", "<C-w>", "Windows")
Normal("<leader>fs", ":update<cr>", "Save file")

-- Rethink this
Normal("gp", "%", "matching bracket")
--Think of a way to better jump to the first paren

Normal("0", "^", "Start of line")
Normal(")", "$", "End of line")

Normal("<leader>bn", vim.cmd.bnext)
Normal("<leader>bp", vim.cmd.bprevious)

-- Keep cursor center when doing things
vim.keymap.set("n", "<C-d>", "<C-d>zz")
vim.keymap.set("n", "<C-u>", "<C-u>zz")
vim.keymap.set("n", "n", "nzz")
vim.keymap.set("n", "N", "Nzz")

vim.keymap.set("n", "<C-o>", "o<Esc>")
