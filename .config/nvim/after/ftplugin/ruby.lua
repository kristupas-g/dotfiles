vim.keymap.set('n', '<leader>t', function()
  local current_file = vim.fn.expand('%:.')
  local test_file_path = current_file:find('_spec.rb') and current_file or vim.b.onv_otherFile
  if test_file_path == nil then
    vim.notify('Could not find test file')
  end
  Tmux_split('bundle exec rspec ' .. test_file_path)
end, { noremap = true, silent = true })

