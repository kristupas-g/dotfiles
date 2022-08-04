local switcher = require("kristupasgaidys.themes.theme_switcher")
local current_theme = switcher.get_current_theme()

vim.cmd("colorscheme " .. current_theme)

local available_themes = require("kristupasgaidys.themes.available_themes")
switcher.available_themes = available_themes

local M = {}
M.setup = function(use)
	for _, value in pairs(available_themes) do
		local theme_table = {
			value.url,
			cond = value.nvim == current_theme,
		}
		if value.config_exists then
			table.insert(theme_table, {
				key = "config",
				value = function()
					require("kristupasgaidys.themes." .. value.nvim)
				end,
			})
		end
		use(theme_table)
	end
end
return M
