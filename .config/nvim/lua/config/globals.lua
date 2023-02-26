Normal = function(keymap, command, label)
  local opts = { silent = true, desc = label }
  vim.keymap.set("n", keymap, command, opts)
end

Print = vim.pretty_print
