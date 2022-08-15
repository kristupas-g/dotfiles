local worktree = require("git-worktree")

worktree.my_create_git_worktree = function ()
  local branch_name = vim.fn.input("Branch name > ")
  worktree.create_worktree(".worktree", "main", branch_name)
end

worktree.setup({})
local telescope = require("telescope")
telescope.load_extension("git_worktree")

-- op = Operations.Switch, Operations.Create, Operations.Delete
-- metadata = table of useful values (structure dependent on op)
--      Switch
--          path = path you switched to
--          prev_path = previous worktree path
--      Create
--          path = path where worktree created
--          branch = branch name
--          upstream = upstream remote name
--      Delete
--          path = path where worktree deleted
worktree.on_tree_change(function(op, metadata)
  if op == worktree.Operations.Switch then
    print("Switched from " .. metadata.prev_path .. " to " .. metadata.path)
  end
end)

Normal("<leader>gw", telescope.extensions.git_worktree.git_worktrees, "Switch worktree")
Normal("<leader>gc", worktree.my_create_git_worktree, "Create worktree")
