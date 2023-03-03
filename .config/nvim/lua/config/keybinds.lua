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

-- Keep cursor center when doing things
vim.keymap.set("n", "<C-d>", "<C-d>zz")
vim.keymap.set("n", "<C-u>", "<C-u>zz")
vim.keymap.set("n", "n", "nzz")
vim.keymap.set("n", "N", "Nzz")

vim.keymap.set("n", "<C-n>", vim.cmd.bnext)
vim.keymap.set("n", "<C-p>", vim.cmd.bprevious)

-- For mac keyboard
vim.keymap.set("n", "<C-o>", "o<Esc>")

Normal("<leader>R", function()
	vim.cmd("Telescope command_picker")
end, "Run cmd in right tmux split")

Normal("<leader>rr", function()
	require("harpoon.tmux").sendCommand("{right-of}", Previous_command .. "\n")
end, "Run prev command")
