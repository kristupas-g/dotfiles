require("config.disables")
require("config.settings")
require("config.bootstrap")
require("config.keymaps")
require("config.statusline")
require("config.autocmds")

require("config.git")
require("plugins.lua-locals").init()

require("lazy").setup("plugins")

vim.g.catppuccin_flavour = "mocha" -- mocha
vim.cmd("colorscheme catppuccin")
