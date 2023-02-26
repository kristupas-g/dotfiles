local tmux = require("utils.tmux")

local M = {}

M.lazygit_ui = function()
  tmux.create_window("Lazygit", "lazygit")
end

M.lazygit_branch = function()
  tmux.create_window("Lazygit", "lazygit branch")
end

M.lazygit_stash = function()
  tmux.create_window("Lazygit", "lazygit stash")
end

M.lazygit_log = function()
  tmux.create_window("Lazygit", "lazygit log")
end

M.lazygit_status = function()
  tmux.create_window("Lazygit", "lazygit status")
end

return M
