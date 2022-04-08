let g:mapleader = "\<Space>"

inoremap jk <esc>
nnoremap <silent> <leader>s :update<cr>
nnoremap <silent> <leader>q :q<cr>

nnoremap <silent> git :Git<cr>
nnoremap <silent> noh :noh<cr>

nnoremap <silent> gd <cmd>lua require('telescope.builtin').lsp_definitions()<cr>
nnoremap <silent> <leader>i <cmd>lua vim.lsp.buf.hover()<cr>
nnoremap <silent> <leader>rn <cmd>lua vim.lsp.buf.rename()<cr>
nnoremap <silent> <leader>. <cmd>lua require('telescope.builtin').lsp_code_actions()<cr>
nnoremap <silent> <leader>e <cmd>lua vim.lsp.diagnostic.show_line_diagnostics()<cr>

nnoremap <silent><leader>k :BufferLineCycleNext<CR>
nnoremap <silent><leader>j :BufferLineCyclePrev<CR>
nnoremap <silent><leader>w :bw<CR>

nnoremap <silent> <leader>f <cmd> :NvimTreeOpen<cr>

nnoremap <silent> <leader>g <cmd>lua require('telescope.builtin').live_grep()<cr>
nnoremap <silent> <leader>E <cmd> :Trouble<cr>
nnoremap <silent> <Leader>p :lua require'telescope.builtin'.find_files()<cr>
nnoremap <silent> <leader>b <cmd>lua require('telescope.builtin').buffers()<cr>
nnoremap <silent> gib <cmd>lua require('telescope.builtin').git_branches()<cr>
nnoremap <silent> <leader>op <cmd>lua require'telescope'.extensions.project.project{}<cr>

autocmd BufWritePre * lua vim.lsp.buf.formatting_sync()
