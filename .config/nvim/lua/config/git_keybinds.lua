local lg = require("personal.lazygit")

Normal("<leader>gg", lg.lazygit_ui, "Lazygit")
Normal("<leader>gb", lg.lazygit_branch, "Git branches")
Normal("<leader>gS", lg.lazygit_stash, "Git stash")
Normal("<leader>gs", lg.lazygit_status, "Git status")
Normal("<leader>gl", lg.lazygit_log, "Git log")
