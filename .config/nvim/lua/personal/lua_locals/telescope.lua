local pickers = require("telescope.pickers")
local finders = require("telescope.finders")
local conf = require("telescope.config").values
local actions = require("telescope.actions")
local action_state = require("telescope.actions.state")

Previous_command = ""

local function launch_command(cmd)
  require("harpoon.tmux").sendCommand("{right-of}", cmd .. "\n")
end

local M = {}

M.get_command = function(opts)
  opts = opts or {}

  if Commands == nil then
    vim.notify("No commands specified in .lua-locals")
  end

  pickers
      .new(opts, {
        prompt_title = "Choose a command ",
        sorter = conf.generic_sorter(opts),
        finder = finders.new_table({
          results = Commands,
          entry_maker = function(entry)
            return {
              value = entry,
              display = entry.name,
              ordinal = entry.name,
            }
          end,
        }),
        attach_mappings = function(prompt_bufnr, map)
          actions.select_default:replace(function()
            actions.close(prompt_bufnr)
            local selection = action_state.get_selected_entry().value
            launch_command(selection.command)
            Previous_command = selection.command
          end)
          return true
        end,
      })
      :find()
end

return M
