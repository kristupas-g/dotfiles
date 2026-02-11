local lazypath = vim.fn.stdpath('data') .. '/lazy/lazy.nvim'
if not (vim.uv or vim.loop).fs_stat(lazypath) then
  local lazyrepo = 'https://github.com/folke/lazy.nvim.git'
  local out = vim.fn.system({
    'git',
    'clone',
    '--filter=blob:none',
    '--branch=stable',
    lazyrepo,
    lazypath,
  })
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

vim.env.JAVA_HOME = '/opt/homebrew/opt/openjdk'
vim.env.PATH = vim.env.JAVA_HOME .. '/bin:' .. vim.env.PATH

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
vim.opt.relativenumber = true
vim.opt.updatetime = 250
vim.opt.timeoutlen = 300
vim.opt.splitright = true
vim.opt.splitbelow = true
vim.opt.list = true
vim.opt.inccommand = 'split'
vim.opt.scrolloff = 999
vim.opt.hlsearch = false
vim.opt.cursorline = true
vim.opt.wrap = false
vim.opt.swapfile = false
vim.opt.laststatus = 3
vim.opt.cmdheight = 0
vim.opt.exrc = true

vim.opt.foldmethod = 'expr'
vim.opt.foldexpr = 'v:lua.vim.treesitter.foldexpr()'
vim.opt.foldcolumn = '0'
vim.opt.foldtext = ''
vim.opt.foldlevel = 99
vim.opt.foldlevelstart = 99
vim.opt.foldnestmax = 4
-- zR open all folds
-- zM close all open folds
-- za toggles the fold at the cursor
-- zk zj to move between folds

vim.opt.background = 'dark'

Maxline = 80
vim.cmd('set colorcolumn=' .. Maxline)

vim.api.nvim_create_autocmd('TextYankPost', {
  group = vim.api.nvim_create_augroup('kickstart-highlight-yank', { clear = true }),
  callback = function()
    vim.highlight.on_yank()
  end,
})

vim.keymap.set('i', 'jk', '<Esc>', { noremap = true, silent = true })

vim.api.nvim_create_user_command('Gcommit', function()
  vim.fn.system('git add . && git commit -m "feat: changes"')
end, {})

vim.api.nvim_create_user_command('Econf', function()
  vim.cmd('e ~/dotfiles/.config/nvim/init.lua')
end, {})

local function lazygit()
  local current_file_dir = vim.fn.expand('%:p:h')
  vim.fn.system("tmux new-window 'cd " .. current_file_dir .. " && lazygit'")
end

vim.keymap.set('n', '<leader>g', lazygit, { noremap = true, silent = false })

local copy_to_clipboard = function()
  vim.cmd("let @+ = expand('%')")
end
vim.api.nvim_create_user_command('Cp', copy_to_clipboard, {})

function Tmux_split(command_to_run)
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

OpenInGH = function()
  local git_cmd = vim.system({ 'git', 'remote', 'get-url', 'origin' }):wait()

  if git_cmd['code'] ~= 0 then
    vim.notify('Not a git repository or origin is not set')
    return
  end

  local remote = git_cmd
    .stdout
    :gsub('\n', '') -- remove newline
    :gsub('^git@', '')
    :gsub('%.git$', '')
    :gsub(':', '/')
  local current_file = vim.fn.expand('%:.')
  local line_no, _ = unpack(vim.api.nvim_win_get_cursor(0))

  local url = string.format('https://%s/blob/master/%s#L%d', remote, current_file, line_no)
  vim.system({ 'open', url })
end

vim.api.nvim_create_user_command('Gh', OpenInGH, {})

vim.keymap.set('n', '<leader>p', '<C-^>')
vim.keymap.set('n', '<leader>qp', ':cprevious<CR>')
vim.keymap.set('n', '<leader>qn', ':cnext<CR>')
vim.keymap.set('n', '<leader>qq', ':copen<CR>')

vim.keymap.set('n', '<C-d>', '<C-d>zz')
vim.keymap.set('n', '<C-u>', '<C-u>zz')

vim.keymap.set('t', 'jk', '<C-\\><C-n>', {
  noremap = true,
  silent = true,
  desc = 'Exit terminal mode',
})

local function open_or_create_pr()
  local file_dir
  if vim.bo.filetype == 'oil' then
    file_dir = require('oil').get_current_dir()
  else
    file_dir = vim.fn.expand('%:p:h')
  end

  if file_dir == '' or file_dir == nil then
    vim.notify('Cannot determine file directory.', vim.log.levels.WARN)
    return
  end

  local gh_command = 'CURRENT_BRANCH=$(git rev-parse --abbrev-ref HEAD) && '
    .. "DEFAULT_BRANCH=$(gh repo view --json defaultBranchRef --jq '.defaultBranchRef.name') && "
    .. 'if [ "$CURRENT_BRANCH" = "$DEFAULT_BRANCH" ]; then exit 1; fi && '
    .. 'git push --set-upstream origin "$CURRENT_BRANCH" && '
    .. 'OPEN_PR_COUNT=$(gh pr list --head "$CURRENT_BRANCH" --state open --limit 1 --json url --jq \'length\') && '
    .. 'if [ "$OPEN_PR_COUNT" -eq 0 ]; then '
    .. 'gh pr create --fill --web; '
    .. 'else '
    .. 'gh pr view --web; '
    .. 'fi'

  local silent_command = '(' .. gh_command .. ') >/dev/null 2>&1'

  vim.system({ 'sh', '-c', silent_command }, {
    cwd = file_dir,
  })
end

vim.keymap.set(
	"n",
	"<leader>gp",
	open_or_create_pr,
	{ desc = "Open or create pull request", silent = true }
)

require('lazy').setup({
  'tpope/vim-sleuth',

  { 'windwp/nvim-autopairs', config = true },

  {
    'sainnhe/gruvbox-material',
    config = function()
      vim.cmd('colorscheme gruvbox-material')
    end,
  },

  {
    'Wansmer/treesj',
    lazy = false,
    config = function()
      require('treesj').setup({
        use_default_keymaps = false,
        max_join_length = 80,
      })
    end,
    keys = {
      {
        '<leader>/',
        function()
          require('treesj').toggle()
        end,
      },
    },
  },

  {
    'ThePrimeagen/harpoon',
    branch = 'harpoon2',
    dependencies = { 'nvim-lua/plenary.nvim' },
    config = function()
      local harpoon = require('harpoon')
      harpoon:setup()

      vim.keymap.set('n', 'M', function()
        harpoon:list():add()
      end)
      vim.keymap.set('n', 'mm', function()
        harpoon.ui:toggle_quick_menu(harpoon:list())
      end)

      vim.keymap.set('n', 'ma', function()
        harpoon:list():select(1)
      end)
      vim.keymap.set('n', 'ms', function()
        harpoon:list():select(2)
      end)
      vim.keymap.set('n', 'md', function()
        harpoon:list():select(3)
      end)
      vim.keymap.set('n', 'mf', function()
        harpoon:list():select(4)
      end)
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
          require('oil').open()
        end,
        mode = 'n',
      },
    },
  },

  {
    'nvim-telescope/telescope.nvim',
    tag = '0.1.8',
    lazy = false,
    dependencies = {
      { 'nvim-lua/plenary.nvim' },
      { 'nvim-telescope/telescope-fzf-native.nvim', build = 'make' },
      { 'nvim-telescope/telescope-live-grep-args.nvim', version = '^1.0.0' },
      { 'nvim-telescope/telescope-frecency.nvim', config = { db_safe_mode = false } },
    },
    config = function()
      local telescope = require('telescope')
      telescope.load_extension('fzf')
      telescope.load_extension('frecency')
      telescope.load_extension('live_grep_args')
      local actions = require('telescope.actions')

      telescope.setup({
        pickers = {
          find_files = {
            theme = 'ivy',
            layout_config = { height = 0.50 },
            previewer = false,
          },
        },
        defaults = {
          mappings = {
            i = {
              ['<esc><esc>'] = false,
              ['jk'] = actions.close,
            },
          },
        },
        extensions = {
          fzf = {
            fuzzy = true,
            override_generic_sorter = true,
            override_file_sorter = true,
            case_mode = 'smart_case',
          },
        },
      })
    end,
    keys = {
      {
        '<leader>j',
        function()
          vim.cmd(
            'Telescope frecency workspace=CWD theme=ivy previewer=false layout_config={height=0.50}'
          )
        end,
      },
      {
        '<leader>w',
        function()
          require('telescope').extensions.live_grep_args.live_grep_args()
        end,
      },
      {
        '<leader>m',
        function()
          require('telescope.builtin').git_status()
        end,
      },
      {
        '<leader><leader>',
        function()
          require('telescope.builtin').resume()
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
      condition = function(buf)
        if vim.bo[buf].filetype == 'harpoon' then
          return false
        end
        return true
      end,
    },
  },

  {
    'nvim-treesitter/nvim-treesitter',
    dependencies = { 'RRethy/nvim-treesitter-endwise' },
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
        'nix',
      },
      auto_install = true,
      highlight = { enable = true },
      indent = { enable = true, disable = { 'ruby' } },
      endwise = { enable = true },
    },
  },

  {
    'hrsh7th/nvim-cmp',
    dependencies = {
      'hrsh7th/cmp-nvim-lsp',
      'hrsh7th/cmp-path',
      'hrsh7th/cmp-buffer',
      'hrsh7th/cmp-cmdline',
      { 'L3MON4D3/LuaSnip', version = 'v2.*' },
      {
        'zbirenbaum/copilot-cmp',
        event = 'LspAttach',
        config = function()
          require('copilot_cmp').setup()
        end,
      },
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
          { name = 'copilot' },
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
        desc = 'Format buffer',
      },
    },
    opts = {
      notify_on_error = false,
      formatters_by_ft = {
        yaml = { 'yamlfmt' },
        lua = { 'stylua' },
        go = { 'gofmt' },
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
          map('<leader>h', vim.lsp.buf.hover)
          map('<leader>en', vim.diagnostic.goto_next)
          map('<leader>ep', vim.diagnostic.goto_prev)
        end,
      })

      local capabilities = vim.lsp.protocol.make_client_capabilities()
      capabilities =
        vim.tbl_deep_extend('force', capabilities, require('cmp_nvim_lsp').default_capabilities())

      local servers = {
        yamlls = {},
        gopls = {},
        groovyls = {},
        pyright = {},
        ruby_lsp = {
          mason = false,
          cmd = { 'mise', 'x', '--', 'ruby-lsp' },
          filetypes = { 'ruby' },
          root_dir = require('lspconfig.util').root_pattern('Gemfile', '.git'),
          settings = {},
        },
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

  -- {
  --   'zbirenbaum/copilot.lua',
  --   event = 'LspAttach',
  --   config = function()
  --     require('copilot').setup({
  --       panel = { enabled = false },
  --       suggestion = { enabled = false },
  --     })
  --   end,
  -- },
  --
  {
    'github/copilot.vim',
    config = function()
      vim.keymap.set('i', '<Right>', 'copilot#Accept("\\<CR>")', {
        expr = true,
        replace_keycodes = false,
      })

      vim.g.copilot_no_tab_map = true
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
  {
    'coder/claudecode.nvim',
    dependencies = { 'folke/snacks.nvim' },
    config = true,
    keys = {
      { '<leader>a', nil, desc = 'AI/Claude Code' },
      { '<leader>ac', '<cmd>ClaudeCode<cr>', desc = 'Toggle Claude' },
      { '<leader>af', '<cmd>ClaudeCodeFocus<cr>', desc = 'Focus Claude' },
      { '<leader>ar', '<cmd>ClaudeCode --resume<cr>', desc = 'Resume Claude' },
      { '<leader>aC', '<cmd>ClaudeCode --continue<cr>', desc = 'Continue Claude' },
      { '<leader>am', '<cmd>ClaudeCodeSelectModel<cr>', desc = 'Select Claude model' },
      { '<leader>ab', '<cmd>ClaudeCodeAdd %<cr>', desc = 'Add current buffer' },
      { '<leader>as', '<cmd>ClaudeCodeSend<cr>', mode = 'v', desc = 'Send to Claude' },
      {
        '<leader>as',
        '<cmd>ClaudeCodeTreeAdd<cr>',
        desc = 'Add file',
        ft = { 'NvimTree', 'neo-tree', 'oil', 'minifiles' },
      },
      { '<leader>aa', '<cmd>ClaudeCodeDiffAccept<cr>', desc = 'Accept diff' },
      { '<leader>ad', '<cmd>ClaudeCodeDiffDeny<cr>', desc = 'Deny diff' },
    },
    opts = {},
  },

  {
    dir = vim.fn.expand('~/vinted/worktree-cli'),
    name = 'gwt',
    lazy = false,
    config = function()
      require('gwt').setup()
    end,
  },
})
