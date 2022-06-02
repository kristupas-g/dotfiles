require("bufferline").setup({
	options = {
		indicator_icon = "",
		numbers = "none",
		diagnostics = "nvim_lsp",
		max_name_length = 20,
		diagnostics_update_in_insert = false,
		diagnostics_indicator = function(count, level, diagnostics_dict, context)
			local icon = level:match("error") and " " or ""
			return " " .. icon
		end,
		show_buffer_close_icons = false,
		show_close_icon = false,
		offsets = { { filetype = "NvimTree", text = "File tree", text_align = "center" } },
		modified_icon = " ",
		separator_style = { "", "" },
	},
})
