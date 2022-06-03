require("neogit").setup({
	disable_signs = false,
	disable_hint = false,
	disable_commit_confirmation = true,
	commit_popup = {
		kind = "floating",
	},
	kind = "replace",
	signs = {
		section = { "", "" },
		item = { "∙", "⤵" },
	},
	integrations = {
		diffview = true,
	},
	sections = {
		untracked = {
			folded = true,
		},
		unstaged = {
			folded = false,
		},
		staged = {
			folded = false,
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
})
