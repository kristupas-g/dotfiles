local set = vim.opt
local global = vim.g

vim.g.adwaita_darker = true
vim.g.catppuccin_flavour = "latte"
vim.cmd("colorscheme catppuccin")

global.mapleader = " "
global.filetype = "plugin indent on"

set.termguicolors = true -- Adds more colors
set.hidden = true -- Required to keep multiple buffers open multiple buffers
set.pumheight = 18 -- Maximum message height
set.encoding = "utf-8" -- The encoding displayed
set.fileencoding = "utf-8" -- The encoding written to file
set.ruler = true -- Show the cursor position all the time
set.cmdheight = 1 -- More space for displaying messages
set.mouse = "a" -- Enable your mouseset
set.splitright = true -- Vertical splits will automatically be to the right
set.tabstop = 2 -- Insert 2 spaces for a tab
set.shiftwidth = 2 -- Change the number of space characters inserted for indentation
set.smarttab = true -- Makes tabbing smarter will realize you have 2 vs 4
set.expandtab = true -- Converts tabs to spaces
set.autoindent = true -- Good auto indent
set.smartindent = true -- Makes indenting smart
set.laststatus = 3 -- Always display the status line
set.ignorecase = true -- Search isnt case sensitive
set.background = "dark" -- Tell vim what the background color looks like
set.showtabline = 0 -- Always show tabs
set.updatetime = 100 -- Faster completion
set.timeoutlen = 500 -- By default timeoutlen is 1000 ms
set.clipboard = "unnamedplus" -- Copy paste between vim and everything else
set.scrolloff = 8 -- Keep cursor from going too low
set.fileformats = { "unix", "dos" } -- Line endings
set.swapfile = false
set.modeline = false
set.conceallevel = 2 -- Required for org
set.concealcursor = "nc" -- Required for org
set.hlsearch = false
set.shadafile = "NONE"
set.shadafile = ""
set.signcolumn = "yes"
