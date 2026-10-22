local function spec_file()
  local current_file = vim.fn.expand('%:.')
  if current_file:find('_spec.rb') then
    return current_file
  end
  return vim.b.onv_otherFile
end

vim.keymap.set('n', '<leader>t', function()
  local test_file_path = spec_file()
  if test_file_path == nil then
    vim.notify('Could not find test file', vim.log.levels.WARN)
    return
  end
  Tmux_split('bundle exec rspec ' .. test_file_path)
end, { buffer = true, noremap = true, silent = true })

vim.keymap.set('n', '<leader>T', function()
  local test_file_path = spec_file()
  if test_file_path == nil then
    vim.notify('Could not find test file', vim.log.levels.WARN)
    return
  end
  local line_no = vim.api.nvim_win_get_cursor(0)[1]
  Tmux_split('bundle exec rspec ' .. test_file_path .. ':' .. line_no)
end, { buffer = true, noremap = true, silent = true })

vim.keymap.set('n', '<leader>cr', function()
  local ts = vim.treesitter
  local parser = ts.get_parser(0, 'ruby')
  if not parser then
    return
  end
  local root = parser:parse()[1]:root()
  local query = ts.query.parse('ruby', '(class name: (constant) @class_name)')
  for _, node in query:iter_captures(root, 0) do
    print(ts.get_node_text(node, 0))
    break
  end
end, { buffer = true })

if vim.g.vscode then
  vim.keymap.set('n', '<leader>w', function()
    require('vscode_workflow').find_in_files({ exclude = '**/*_spec.rb' })
  end, { buffer = true })
  return
end

vim.keymap.set('n', '<leader>w', function()
  require('telescope').extensions.live_grep_args.live_grep_args({
    default_text = '"" --glob !**_spec.rb',
    attach_mappings = function()
      vim.schedule(function()
        vim.api.nvim_win_set_cursor(0, { vim.api.nvim_win_get_cursor(0)[1], 3 })
      end)
      return true
    end,
  })
end, { buffer = true })
