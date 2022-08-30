local tmux = require("kristupasgaidys.tmux")
local utils = require("kristupasgaidys.utils")

local M = {}

local function get_running_project_window_name()
	return utils.get_project_name() .. "_run"
end

M.run_project = function()
	local name = get_running_project_window_name()
	tmux.create_window(name, Run_cmd, true)
end

M.kill_running_project = function(on_killed)
	local name = get_running_project_window_name()
	tmux.delete_window(name, on_killed)
end

M.restart_project = function()
	M.kill_running_project(M.run_project)
end

return M
