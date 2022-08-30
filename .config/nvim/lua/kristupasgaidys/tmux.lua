local M = {}

M.create_window = function(window_name, command, no_focus)
	local args = { "tmux", "new-window", "-n", window_name, command }
	if no_focus then
		table.insert(args, 3, "-d")
	end

	vim.fn.jobstart(args)
end

M.delete_window = function(window_name, on_exit)
	vim.fn.jobstart({ "tmux", "kill-window", "-t", window_name }, {
		on_exit = function()
			if on_exit then
				on_exit()
			end
		end,
	})
end

return M
