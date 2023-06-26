return {
	"klen/nvim-test",
	config = function()
		require("nvim-test").setup({
			run = true,
			commands_create = false,
			filename_modifier = ":.",
			silent = true,
			term = "terminal",
			termOpts = {
				direction = "horizontal",
				width = 96,
				height = 12,
				go_back = true,
				stopinsert = "true",
				keep_one = true,
			},
		})
		require("nvim-test.runners.rspec"):setup({
			command = { "bundle", "exec", "rspec" }, -- a command to run the test runner
			finder = function(filename)
				print("HELLO WORLD")
				vim.pretty_print(filename)
				return filename
			end,
		})
	end,
}
