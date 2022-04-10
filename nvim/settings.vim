syntax enable                           " Enables syntax highlighing

set termguicolors
colorscheme gruvbox-material
let g:tokyonight_style = "storm"
let g:everforest_background = 'soft'

filetype plugin indent on
set hidden                              " Required to keep multiple buffers open multiple buffers
set pumheight=18
set encoding=utf-8                      " The encoding displayed
set fileencoding=utf-8                  " The encoding written to file
set ruler                               " Show the cursor position all the time
set cmdheight=1                         " More space for displaying messages
set mouse=a                             " Enable your mouse
set splitright                          " Vertical splits will automatically be to the right
set tabstop=2                           " Insert 2 spaces for a tab
set shiftwidth=2                        " Change the number of space characters inserted for indentation
set smarttab                            " Makes tabbing smarter will realize you have 2 vs 4
set expandtab                           " Converts tabs to spaces
set smartindent                         " Makes indenting smart
set autoindent                          " Good auto indent
set laststatus=0                        " Always display the status line
set number                              " Line numbers
set ignorecase                          " Search isnt case sensitive
set background=dark                     " tell vim what the background color looks like
set showtabline=0                       " Always show tabs
set noshowmode                          " We don't need to see things like -- INSERT -- anymore
set updatetime=100                      " Faster completion
set timeoutlen=500                      " By default timeoutlen is 1000 ms
set clipboard=unnamedplus               " Copy paste between vim and everything else 
set scrolloff=8                         " Keep cursor from going too low
set nofixendofline
set fileformats=mac,unix,dos


let g:nvim_tree_respect_buf_cwd = 1

augroup highlight_yank                  
    autocmd!
    au TextYankPost * silent! lua vim.highlight.on_yank{higroup="IncSearch", timeout= 200}
augroup END


let g:vimwiki_list = [{'path': '~/notes/',
                      \ 'syntax': 'markdown', 'ext': '.md'}]

