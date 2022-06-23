require("git-worktree").setup({})

require("telescope").load_extension("git_worktree")

normal("<leader>gw", require("telescope").extensions.git_worktree.git_worktrees, "Switch worktree")
normal("<leader>gc", require("telescope").extensions.git_worktree.create_git_worktree, "Create worktree")
