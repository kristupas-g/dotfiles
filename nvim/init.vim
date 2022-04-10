call plug#begin('~/.config/nvim/plugged')
Plug 'nvim-lua/plenary.nvim'                      " Dependancy

Plug 'folke/tokyonight.nvim', { 'branch': 'main' }
Plug 'sainnhe/gruvbox-material'

Plug 'kyazdani42/nvim-web-devicons'               " Icons
Plug 'numToStr/Comment.nvim'                      " Commenting utility
Plug 'windwp/nvim-autopairs'                      " Matching pairs
Plug 'p00f/nvim-ts-rainbow'                       " Makes brackets colored
Plug 'tpope/vim-surround'                         " Utility for changing brackets
Plug 'windwp/nvim-ts-autotag'                     " Ts ext for matching html tags
Plug 'lukas-reineke/indent-blankline.nvim'        " Shows indentation
Plug 'nvim-lualine/lualine.nvim'                  " Status line
Plug 'JoosepAlviste/nvim-ts-context-commentstring'" Jsx commenting 
Plug 'akinsho/bufferline.nvim'                    " Bufferline
Plug 'folke/trouble.nvim'                         " Diagnostics window
" Plug 'vimwiki/vimwiki'                            " Notes

Plug 'prettier/vim-prettier'

Plug 'lewis6991/gitsigns.nvim'                    " Shows git diff near line
Plug 'kdheepak/lazygit.nvim'                      " Git ui

                                                  " FzF and FileBrowser
Plug 'nvim-telescope/telescope.nvim'
Plug 'nvim-telescope/telescope-fzf-native.nvim', { 'do': 'make' }
Plug 'kyazdani42/nvim-tree.lua'
Plug 'L3MON4D3/LuaSnip'                           

                                                  " LSP
Plug 'onsails/lspkind-nvim'                       
Plug 'neovim/nvim-lspconfig'
Plug 'jose-elias-alvarez/nvim-lsp-ts-utils'
Plug 'nvim-treesitter/nvim-treesitter'
Plug 'hrsh7th/nvim-cmp'
Plug 'hrsh7th/cmp-buffer'
Plug 'hrsh7th/cmp-path'
Plug 'hrsh7th/cmp-nvim-lsp'
Plug 'saadparwaiz1/cmp_luasnip'
Plug 'editorconfig/editorconfig-vim'
Plug 'hrsh7th/cmp-cmdline'                        " Cmdline completion

Plug 'nathom/filetype.nvim'
call plug#end()

source ~/.config/nvim/keymaps.vim
source ~/.config/nvim/settings.vim

hi normal guibg=000000

lua require('filetype').setup{}

lua require('kristupasgaidys.telescope')
lua require('kristupasgaidys.comment')
lua require('kristupasgaidys.nvim-autopairs')
lua require('kristupasgaidys.gitsigns')
lua require('kristupasgaidys.nvim-tree')
lua require('kristupasgaidys.lspconfig')
lua require('kristupasgaidys.treesitter')
lua require('kristupasgaidys.indent-blankline')
lua require('kristupasgaidys.cmp')
lua require('kristupasgaidys.bufferline')
lua require('kristupasgaidys.trouble')
