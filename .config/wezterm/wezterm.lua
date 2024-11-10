local wezterm = require("wezterm")
local config = {}

config.color_scheme = "Gruvbox Dark (Gogh)"

config.font = wezterm.font("Iosevka Nerd Font Mono")
config.font_size = 13

config.enable_tab_bar = false
-- config.disable_default_key_bindings = true
config.window_decorations = "RESIZE"

config.adjust_window_size_when_changing_font_size = false
config.window_close_confirmation = 'NeverPrompt'

local vertical_padding = 3
local horizontal_padding = 3

config.window_padding = {
  top = vertical_padding,
  bottom = vertical_padding,
  left = horizontal_padding,
  right = horizontal_padding,
}

return config
