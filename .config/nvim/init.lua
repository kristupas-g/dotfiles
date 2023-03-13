require("config.disables")
require("config.settings")
require("config.bootstrap")
require("config.globals")
require("config.keybinds")
require("config.autocmds")
require("config.statusline")

require("lazy").setup("plugins", require("config.lazy"))

vim.cmd.colorscheme("catppuccin")
