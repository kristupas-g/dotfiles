require("config.disables")
require("config.settings")
require("config.bootstrap")
require("config.globals")
require("config.keybinds")
require("config.autocmds")
require("config.statusline")

-- This will leave later
require("personal.lua_locals").setup()

require("lazy").setup("plugins", require("config.lazy"))
