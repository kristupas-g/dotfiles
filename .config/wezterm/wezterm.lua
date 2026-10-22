local wezterm = require('wezterm')
local config = wezterm.config_builder()

config.color_scheme = 'Gruvbox Dark (Gogh)'
config.font = wezterm.font('Iosevka Nerd Font Mono')
config.font_size = 22
config.enable_tab_bar = false
config.window_decorations = 'RESIZE'
config.adjust_window_size_when_changing_font_size = false
config.window_close_confirmation = 'NeverPrompt'
config.window_padding = { top = 3, bottom = 3, left = 3, right = 3 }

return config
