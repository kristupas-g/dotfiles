local lazypath = vim.fn.stdpath('data') .. '/lazy/lazy.nvim'
if not (vim.uv or vim.loop).fs_stat(lazypath) then
  local lazyrepo = 'https://github.com/folke/lazy.nvim.git'
  local out =
    vim.fn.system({ 'git', 'clone', '--filter=blob:none', '--branch=stable', lazyrepo, lazypath })
  if vim.v.shell_error ~= 0 then
    vim.api.nvim_echo({
      { 'Failed to clone lazy.nvim:\n', 'ErrorMsg' },
      { out, 'WarningMsg' },
      { '\nPress any key to exit...' },
    }, true, {})
    vim.fn.getchar()
    os.exit(1)
  end
end
vim.opt.rtp:prepend(lazypath)

vim.g.mapleader = ' '
vim.g.maplocalleader = ' '
vim.g.have_nerd_font = false
vim.opt.number = true
vim.opt.mouse = 'a'
vim.opt.showmode = false
vim.schedule(function()
  vim.opt.clipboard = 'unnamedplus'
end)
vim.opt.breakindent = true
vim.opt.undofile = true
vim.opt.ignorecase = true
vim.opt.smartcase = true
vim.opt.signcolumn = 'yes'
vim.opt.updatetime = 250
vim.opt.timeoutlen = 300
vim.opt.splitright = true
vim.opt.splitbelow = true
vim.opt.list = true
vim.opt.inccommand = 'split'
vim.opt.scrolloff = 20
vim.opt.hlsearch = false
vim.opt.cursorline = true
vim.opt.wrap = false
vim.opt.swapfile = false

vim.api.nvim_create_autocmd('TextYankPost', {
  group = vim.api.nvim_create_augroup('kickstart-highlight-yank', { clear = true }),
  callback = function()
    vim.highlight.on_yank()
  end,
})

vim.keymap.set('i', 'jk', '<Esc>', { noremap = true, silent = true })

vim.api.nvim_create_user_command('Econf', function()
  vim.cmd('e ~/dotfiles/.config/nvim/init.lua')
end, {})

local function lazygit()
  local current_file_dir = vim.fn.expand('%:p:h')
  vim.fn.system("tmux popup -h 30 -w 120 -d '" .. current_file_dir .. "' -E lazygit status")
end

vim.keymap.set('n', '<leader>g', lazygit, { noremap = true, silent = true })

local function tmux_split(command_to_run)
  local current_pane = tonumber(vim.fn.system("tmux display-message -p '#P'"))
  local left_pane = tonumber(
    vim.fn
      .system(
        "tmux list-panes -F '#{pane_index} #{pane_left}' | grep -v "
          .. current_pane
          .. " | awk '{print $1}'"
      )
      :match('%S+')
  )

  if left_pane == nil then
    local current_file_dir = vim.fn.getcwd()
    vim.fn.system('tmux split-window -h -c ' .. current_file_dir)

    left_pane = tonumber(
      vim.fn
        .system(
          "tmux list-panes -F '#{pane_index} #{pane_left}' | grep -v "
            .. current_pane
            .. " | awk '{print $1}'"
        )
        :match('%S+')
    )
  end

  vim.fn.system('tmux send-keys -t ' .. left_pane .. " '" .. command_to_run .. "' C-m")
end

vim.keymap.set('n', '<leader>t', function()
  local current_file = vim.fn.expand('%:.')
  local test_file_path = current_file:find('_spec.rb') and current_file or vim.b.onv_otherFile
  if test_file_path == nil then
    vim.notify('Could not find test file')
  end
  tmux_split('bundle exec rspec ' .. test_file_path)
end, { noremap = true, silent = true })

require('lazy').setup({
  'tpope/vim-sleuth',

  { 'windwp/nvim-autopairs', config = true },

  {
    'echasnovski/mini.base16',
    version = '*',
    config = function()
      local plugin = require('mini.base16')
      plugin.setup({
        palette = plugin.mini_palette('#131313', '#B2CDB5', 75),
      })
      vim.cmd('colorscheme minicyan')
    end,
  },

  {
    'stevearc/oil.nvim',
    lazy = false,
    opts = {
      lsp_file_methods = { enabled = false },
      view_options = { show_hidden = true },
      watch_for_changes = true,
      delete_to_trash = true,
      skip_confirm_for_simple_edits = true,
      prompt_save_on_select_new_entry = false,
    },
    keys = {
      {
        '<leader>e',
        function()
          vim.cmd('Oil')
        end,
        mode = 'n',
      },
    },
  },

  {
    'ibhagwan/fzf-lua',
    lazy = false,
    config = function()
      require('fzf-lua').setup({})
    end,
    keys = {
      {
        '<leader><leader>',
        function()
          require('fzf-lua').files({
            previewer = false,
            resume = true,
            git_icons = false,
            cwd = vim.fn.getcwd(),
          })
        end,
      },
      {
        '<leader>w',
        function()
          require('fzf-lua').grep_last()
        end,
      },
      {
        '<leader>b',
        function()
          require('fzf-lua').git_branches()
        end,
      },
    },
  },

  {
    'pocco81/auto-save.nvim',
    opts = {
      enabled = true,
      trigger_events = { 'InsertLeave' },
      execution_message = { message = '' },
    },
  },

  {
    'nvim-treesitter/nvim-treesitter',
    build = ':TSUpdate',
    main = 'nvim-treesitter.configs',
    opts = {
      ensure_installed = {
        'bash',
        'diff',
        'html',
        'lua',
        'luadoc',
        'query',
        'vim',
        'vimdoc',
        'json',
        'go',
        'ruby',
      },
      auto_install = true,
      highlight = { enable = true },
      indent = { enable = true, disable = { 'ruby' } },
    },
  },

  {
    'hrsh7th/nvim-cmp',
    dependencies = {
      'hrsh7th/cmp-nvim-lsp',
      'hrsh7th/cmp-path',
      'hrsh7th/cmp-buffer',
      'hrsh7th/cmp-cmdline',
    },
    config = function()
      local cmp = require('cmp')
      cmp.setup({
        completion = { completeopt = 'menu,menuone,noinsert' },
        mapping = cmp.mapping.preset.insert({
          ['<Down>'] = cmp.mapping.select_next_item(),
          ['<Up>'] = cmp.mapping.select_prev_item(),

          ['<C-n>'] = cmp.mapping.scroll_docs(-4),
          ['<C-p>'] = cmp.mapping.scroll_docs(4),

          ['<Right>'] = cmp.mapping.confirm({ select = true }),
        }),
        sources = {
          { name = 'nvim_lsp' },
          { name = 'path' },
          { name = 'buffer' },
        },
      })
    end,
  },

  {
    'stevearc/conform.nvim',
    cmd = { 'ConformInfo' },
    keys = {
      {
        '<leader>f',
        function()
          require('conform').format({ async = true, lsp_format = 'fallback' })
        end,
        mode = '',
        desc = '[F]ormat buffer',
      },
    },
    opts = {
      notify_on_error = false,
      formatters_by_ft = {
        lua = { 'stylua' },
      },
    },
  },

  {
    'neovim/nvim-lspconfig',
    dependencies = {
      { 'williamboman/mason.nvim', config = true },
      'williamboman/mason-lspconfig.nvim',
      'WhoIsSethDaniel/mason-tool-installer.nvim',
      'hrsh7th/cmp-nvim-lsp',
    },
    config = function()
      vim.api.nvim_create_autocmd('LspAttach', {
        group = vim.api.nvim_create_augroup('kickstart-lsp-attach', { clear = true }),
        callback = function(event)
          local map = function(keys, func, mode)
            mode = mode or 'n'
            vim.keymap.set(mode, keys, func, { buffer = event.buf })
          end

          map('gd', vim.lsp.buf.definition)
          map('<leader>rn', vim.lsp.buf.rename)
          map('<leader>.', vim.lsp.buf.code_action, { 'n', 'x' })
          map('<leader>en', vim.diagnostic.goto_next)
          map('<leader>ep', vim.diagnostic.goto_prev)
        end,
      })

      local capabilities = vim.lsp.protocol.make_client_capabilities()
      capabilities =
        vim.tbl_deep_extend('force', capabilities, require('cmp_nvim_lsp').default_capabilities())

      local servers = {
        gopls = {},
        pyright = {},
        lua_ls = {
          on_init = function(client)
            if client.workspace_folders then
              local path = client.workspace_folders[1].name
              if
                vim.loop.fs_stat(path .. '/.luarc.json')
                or vim.loop.fs_stat(path .. '/.luarc.jsonc')
              then
                return
              end
            end

            client.config.settings.Lua = vim.tbl_deep_extend('force', client.config.settings.Lua, {
              runtime = { version = 'LuaJIT' },
              workspace = {
                checkThirdParty = false,
                library = { vim.env.VIMRUNTIME },
              },
            })
          end,
          settings = {
            Lua = {},
          },
        },
      }

      require('mason').setup()

      local ensure_installed = vim.tbl_keys(servers or {})
      vim.list_extend(ensure_installed, {
        'stylua',
      })
      require('mason-tool-installer').setup({ ensure_installed = ensure_installed })

      require('mason-lspconfig').setup({
        handlers = {
          function(server_name)
            local server = servers[server_name] or {}
            server.capabilities =
              vim.tbl_deep_extend('force', {}, capabilities, server.capabilities or {})
            require('lspconfig')[server_name].setup(server)
          end,
        },
      })

      vim.lsp.handlers['textDocument/publishDiagnostics'] =
        vim.lsp.with(vim.lsp.diagnostic.on_publish_diagnostics, {
          virtual_text = true,
          signs = false,
          underline = false,
          update_in_insert = false,
        })
    end,
  },

  {
    'rgroli/other.nvim',
    lazy = false,
    config = function()
      require('other-nvim').setup({
        mappings = {
          'golang',
          'python',
          {
            pattern = '/app/(.*)/(.*).rb',
            target = {
              { context = 'test', target = '/spec/%1/%2_spec.rb' },
            },
          },
          {
            pattern = '(.+)/spec/(.*)/(.*)_spec.rb',
            target = {
              { target = '%1/app/%2/%3.rb' },
            },
          },
        },
      })
    end,
    keys = {
      {
        '<leader>o',
        function()
          require('other-nvim').open()
        end,
        mode = 'n',
      },
      {
        '<leader>O',
        function()
          require('other-nvim').openVSplit()
        end,
        mode = 'n',
      },
    },
  },
})
