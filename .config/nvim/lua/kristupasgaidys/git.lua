local tmux = require("kristupasgaidys.tmux")

local lazygit_ui = function()
	tmux.create_window("Lazygit", "lazygit")
end

local lazygit_branch = function()
	tmux.create_window("Lazygit", "lazygit branch")
end

local lazygit_stash = function()
	tmux.create_window("Lazygit", "lazygit stash")
end

local lazygit_log = function()
	tmux.create_window("Lazygit", "lazygit log")
end

local lazygit_status = function()
	tmux.create_window("Lazygit", "lazygit status")
end

local pull_from_upstream = function()
	local std_out = vim.fn.systemlist({ "git", "pull", "origin", "main" }, {})
	local output_str = ""
	for _, str in ipairs(std_out) do
		output_str = output_str .. str
	end
	vim.pretty_print(output_str)
end

Normal("<leader>gg", lazygit_ui, "Lazygit")
Normal("<leader>gb", lazygit_branch, "Git branches")
Normal("<leader>gS", lazygit_stash, "Git stash")
Normal("<leader>gs", lazygit_status, "Git status")
Normal("<leader>gl", lazygit_log, "Git log")
Normal("<leader>gpu", pull_from_upstream, "Pull from upstream")
