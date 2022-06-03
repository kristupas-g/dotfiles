local actions = require("diffview.actions")

require("diffview").setup({
	file_panel = {
		listing_style = "list",
		win_config = {
			position = "bottom",
			height = 7,
		},
	},
	file_history_panel = {
		log_options = {
			max_count = 64,
			no_merges = true,
		},
		win_config = {
			position = "bottom",
			height = 6,
		},
	},
	hooks = {
		view_opened = function()
			vim.keymap.set("n", "q", ":DiffviewClose<cr>", { silent = true })
		end,
		view_closed = function()
			vim.keymap.del({ "n" }, "q")
		end,
	},
	keymaps = {
		disable_defaults = true,
		view = {
			["n"] = actions.select_next_entry,
			["N"] = actions.select_prev_entry,
			["gf"] = actions.goto_file,
			["gs"] = actions.goto_file_split,
			["<C-f>"] = actions.toggle_files,
		},
		file_panel = {
			["j"] = actions.next_entry,
			["k"] = actions.prev_entry,
			["<cr>"] = actions.select_entry,
			["R"] = actions.refresh_files,
			["L"] = actions.open_commit_log,
			["gf"] = actions.goto_file,
			["gs"] = actions.goto_file_split,
			["<C-f>"] = actions.toggle_files,
		},
		file_history_panel = {
			["go"] = actions.options,
			["y"] = actions.copy_hash,
			["j"] = actions.next_entry,
			["k"] = actions.prev_entry,
			["<cr>"] = actions.select_entry,
			["gf"] = actions.goto_file,
			["gs"] = actions.goto_file_split,
			["<C-f>"] = actions.toggle_files,
		},
		option_panel = {
			["q"] = actions.close,
			["<tab>"] = actions.select_entry,
		},
	},
})
