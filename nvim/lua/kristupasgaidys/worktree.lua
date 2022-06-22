require("git-worktree").setup({ })

normal("<leader>gw", "lua require(\"telescope\").extensions.git_worktree.git_worktrees", "Switch worktree")
normal("<leader>gc", "lua require(\"telescope\").extensions.git_worktree.create_git_worktree", "Create worktree")
