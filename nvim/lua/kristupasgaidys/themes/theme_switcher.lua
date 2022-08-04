local pickers = require("telescope.pickers")
local finders = require("telescope.finders")
local conf = require("telescope.config").values
local actions = require("telescope.actions")
local action_state = require("telescope.actions.state")
local Job = require("plenary.job")

local M = {}

M.available_themes = {}

local switch_kitty_theme = function(theme)
	local kitty_theme = theme.kitty

	Job
		:new({
			command = "kitty",
			args = { "+kitten", "themes", "--reload-in=all", kitty_theme },
		})
		:sync()
end

local cache_theme = function(theme)
	local path = vim.fn.stdpath("data") .. "/theme"
	local file = io.open(path, "w+")
	io.output(file)
	io.write(theme)
	io.close(file)
end

M.get_current_theme = function()
	local path = vim.fn.stdpath("data") .. "/theme"
	local file = io.open(path, "r")
	io.input(file)
	local theme = io.read()
	io.close(file)
	return theme
end

local switch_nvim_theme = function(theme)
	vim.cmd("colorscheme " .. theme.nvim)
	local path = vim.fn.stdpath("config") .. "/init.lua"
	vim.cmd("source " .. path) -- Needed for integrations to take effect
end

local get_picker_options = function()
	local options = {}
	for key, _ in pairs(M.available_themes) do
		table.insert(options, key)
	end
	return options
end

M.switch_theme = function(opts)
	opts = opts or {}
	pickers.new(opts, {
		prompt_title = "Change theme",
		finder = finders.new_table({
			results = get_picker_options(),
		}),
		attach_mappings = function(prompt_bufnr, _)
			actions.select_default:replace(function()
				actions.close(prompt_bufnr)
				local selection = action_state.get_selected_entry()
				local theme = M.available_themes[selection[1]]
				switch_kitty_theme(theme)
				cache_theme(theme.nvim)
				switch_nvim_theme(theme)
			end)
			return true
		end,
		sorter = conf.generic_sorter(opts),
	}):find()
end

return M
