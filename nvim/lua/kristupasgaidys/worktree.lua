require("git-worktree").setup({})

require("telescope").load_extension("git_worktree")

Normal("<leader>gw", require("telescope").extensions.git_worktree.git_worktrees, "Switch worktree")
Normal("<leader>gc", require("telescope").extensions.git_worktree.create_git_worktree, "Create worktree")
