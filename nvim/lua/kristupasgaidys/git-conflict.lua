require("git-conflict").setup({ default_mappings = false })

normal("<leader>go", "<Plug>(git-conflict-ours)", "Take ours")
normal("<leader>gt", "<Plug>(git-conflict-theirs)", "Take theirs")
normal("<leader>gb", "<Plug>(git-conflict-both)", "Take both")
normal("<leader>g0", "<Plug>(git-conflict-none)", "Take none")
normal("<leader>gn", "<Plug>(git-conflict-prev-conflict)", "Go to previous conflict")
normal("<leader>gp", "<Plug>(git-conflict-next-conflict)", "Go to next conflict")
