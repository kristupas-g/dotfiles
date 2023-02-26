local function create_keybinds()
	local git = require("neogit")
	Normal("<leader>gs", git.open, "Neogit")
end

return {
	"TimUntersberger/neogit",
	dependencies = "nvim-lua/plenary.nvim",
	config = function()
		require("neogit").setup({
			disable_signs = true,
			disable_hint = true,
			disable_context_highlighting = false,
			disable_commit_confirmation = true,
			auto_refresh = true,
			disable_builtin_notifications = true,
			use_magit_keybindings = false,
			kind = "tab",
			console_timeout = 2000,
			auto_show_console = true,
			commit_popup = {
				kind = "vsplit",
			},
			popup = {
				kind = "split",
			},
			-- signs = {
			-- 	section = { "❱", "v" },
			-- 	item = { "❱", "v" },
			-- 	hunk = { "", "" },
			-- },
			sections = {
				untracked = {
					folded = true,
				},
				unstaged = {
					folded = false,
				},
				staged = {
					folded = true,
				},
				stashes = {
					folded = true,
				},
				unpulled = {
					folded = true,
				},
				unmerged = {
					folded = true,
				},
				recent = {
					folded = true,
				},
			},
			mappings = {
				status = {
					["q"] = "Close",
					["1"] = "Depth1",
					["2"] = "Depth2",
					["3"] = "Depth3",
					["4"] = "Depth4",
					["<tab>"] = "Toggle",
					["x"] = "Discard",
					["s"] = "Stage",
					["S"] = "StageUnstaged",
					["<c-s>"] = "StageAll",
					["u"] = "Unstage",
					["U"] = "UnstageStaged",
					["d"] = "DiffAtFile",
					["$"] = "CommandHistory",
					["#"] = "Console",
					["<c-r>"] = "RefreshBuffer",
					["<enter>"] = "GoToFile",
					["<c-v>"] = "VSplitOpen",
					["<c-x>"] = "SplitOpen",
					["<c-t>"] = "TabOpen",
					["?"] = "HelpPopup",
					["D"] = "DiffPopup",
					["p"] = "PullPopup",
					["r"] = "RebasePopup",
					["P"] = "PushPopup",
					["c"] = "CommitPopup",
					["L"] = "LogPopup",
					["Z"] = "StashPopup",
					["b"] = "BranchPopup",
				},
			},
			create_keybinds(),
		})
	end,
}
