return {
	"kyazdani42/nvim-tree.lua",
	disabled = true,
	dependencies = "kyazdani42/nvim-web-devicons",
	config = function()
		require("nvim-tree").setup({
			disable_netrw = true,
			hijack_cursor = true,
			open_on_setup = false,
			respect_buf_cwd = true,
			view = {
				adaptive_size = true,
				width = 40,
				hide_root_folder = true,
				signcolumn = "no",
			},
			renderer = {
				group_empty = false,
				highlight_opened_files = "all",
				icons = {
					webdev_colors = true,
					padding = "    ",
					show = {
						git = false,
					},
				},
			},
			update_focused_file = {
				enable = true,
				update_cwd = false,
			},
			git = {
				enable = false,
			},
			actions = {
				use_system_clipboard = true,
				open_file = {
					quit_on_open = true,
				},
				remove_file = {
					close_window = true,
				},
			},
		})

		Normal("<leader>ft", ":NvimTreeToggle<cr>", "File tree")

	end
}
