require("orgmode").setup({
	org_agenda_files = {},
	org_default_notes_file = "",
	win_split_mode = "tabnew",
})

require("orgmode").setup_ts_grammar()
require("headlines").setup()
require("org-bullets").setup()
