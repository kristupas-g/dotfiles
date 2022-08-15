local worktree = require("git-worktree")
local telescope = require("telescope")
local notify = require("notify")

worktree.my_create_git_worktree = function ()
  local branch_name = vim.fn.input("Branch name > ")
  worktree.create_worktree(".worktree/" .. branch_name, branch_name, "origin")
end

local worktree_changed=function(op, metadata)  

end

local worktree_created=function(op, metadata)  

end

local worktree_deleted=function(op, metadata)  

end

worktree.on_tree_change(function(op, metadata)
  if op == worktree.Operations.Switch then
    worktree_changed(op, metadata)
  end
  if op == worktree.Operations.Create then
    worktree_created(op, metadata)
  end
  if op == worktree.Operations.Delete then
    worktree_deleted(op, metadata)
  end
end)

worktree.setup({})
telescope.load_extension("git_worktree")

Normal("<leader>gw", telescope.extensions.git_worktree.git_worktrees, "Switch worktree")
Normal("<leader>gc", worktree.my_create_git_worktree, "Create worktree from main")
