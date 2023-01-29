require("config.disables")
require("config.settings")
require("config.bootstrap")
require("config.keymaps")
require("config.statusline")
require("config.autocmds")

require("config.git")

require("lazy").setup("plugins", require("config.lazy"))
