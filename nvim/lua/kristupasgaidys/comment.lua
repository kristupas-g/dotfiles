pre_hook = function(_ctx)
	return require("ts_context_commentstring.internal").calculate_commentstring()
end

require("Comment").setup({
	active = true,
	padding = true,
	ignore = "^$",
	pre_hook = pre_hook,
})
