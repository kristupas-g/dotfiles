if vim.fn.has('nvim-0.12') == 0 then
  vim.api.nvim_echo({
    {
      'This config needs Neovim 0.12 or newer, found ' .. tostring(vim.version()) .. '.\n',
      'ErrorMsg',
    },
    { 'Run: brew upgrade neovim && brew install tree-sitter-cli\n', 'WarningMsg' },
  }, true, {})
  return
end

local lazypath = vim.fn.stdpath('data') .. '/lazy/lazy.nvim'
if not vim.uv.fs_stat(lazypath) then
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

local in_vscode = vim.g.vscode ~= nil

vim.env.JAVA_HOME = '/opt/homebrew/opt/openjdk'
vim.env.PATH = vim.env.JAVA_HOME .. '/bin:' .. vim.env.PATH

vim.g.mapleader = ' '
vim.g.maplocalleader = ' '

vim.opt.ignorecase = true
vim.opt.smartcase = true
vim.opt.updatetime = 250
vim.opt.timeoutlen = 300
vim.opt.hlsearch = false
vim.opt.swapfile = false
vim.opt.exrc = true
vim.schedule(function()
  vim.opt.clipboard = 'unnamedplus'
end)

if not in_vscode then
  vim.opt.number = true
  vim.opt.relativenumber = true
  vim.opt.mouse = 'a'
  vim.opt.showmode = false
  vim.opt.breakindent = true
  vim.opt.undofile = true
  vim.opt.signcolumn = 'yes'
  vim.opt.splitright = true
  vim.opt.splitbelow = true
  vim.opt.list = true
  vim.opt.inccommand = 'split'
  vim.opt.scrolloff = 999
  vim.opt.cursorline = true
  vim.opt.wrap = false
  vim.opt.laststatus = 3
  vim.opt.cmdheight = 0
  vim.opt.colorcolumn = '80'
  vim.opt.background = 'dark'

  vim.opt.foldmethod = 'expr'
  vim.opt.foldexpr = 'v:lua.vim.treesitter.foldexpr()'
  vim.opt.foldcolumn = '0'
  vim.opt.foldtext = ''
  vim.opt.foldlevel = 99
  vim.opt.foldlevelstart = 99
  vim.opt.foldnestmax = 4

  vim.api.nvim_create_autocmd('TextYankPost', {
    group = vim.api.nvim_create_augroup('highlight-yank', { clear = true }),
    callback = function()
      vim.hl.on_yank()
    end,
  })

  vim.keymap.set('i', 'jk', '<Esc>', { noremap = true, silent = true })
  vim.keymap.set(
    't',
    'jk',
    '<C-\\><C-n>',
    { noremap = true, silent = true, desc = 'Exit terminal mode' }
  )

  vim.keymap.set('n', '<leader>p', '<C-^>')
  vim.keymap.set('n', '<leader>qp', ':cprevious<CR>')
  vim.keymap.set('n', '<leader>qn', ':cnext<CR>')
  vim.keymap.set('n', '<leader>qq', ':copen<CR>')
end

vim.keymap.set('n', '<C-d>', '<C-d>zz')
vim.keymap.set('n', '<C-u>', '<C-u>zz')

vim.api.nvim_create_user_command('Gcommit', function()
  vim.fn.system('git add . && git commit -m "feat: changes"')
end, {})

vim.api.nvim_create_user_command('Gmain', function()
  local function run(cmd)
    return vim.system(cmd):wait()
  end

  local status = run({ 'git', 'status', '--porcelain' })
  if status.code ~= 0 then
    vim.notify('Not a git repository', vim.log.levels.ERROR)
    return
  end

  if status.stdout and status.stdout ~= '' then
    vim.notify('Committing changes...', vim.log.levels.INFO)
    if run({ 'git', 'add', '.' }).code ~= 0 then
      vim.notify('Failed to stage changes', vim.log.levels.ERROR)
      return
    end
    local commit = run({ 'git', 'commit', '-m', 'feat: checkpoint' })
    if commit.code ~= 0 then
      vim.notify('Failed to commit: ' .. (commit.stderr or ''), vim.log.levels.ERROR)
      return
    end
  end

  vim.notify('Fetching...', vim.log.levels.INFO)
  local fetch = run({ 'git', 'fetch' })
  if fetch.code ~= 0 then
    vim.notify('Fetch failed: ' .. (fetch.stderr or ''), vim.log.levels.ERROR)
    return
  end

  local branch = run({ 'git', 'show-ref', '--verify', 'refs/heads/main' }).code == 0 and 'main'
    or 'master'
  vim.notify('Switching to ' .. branch .. '...', vim.log.levels.INFO)
  local checkout = run({ 'git', 'checkout', branch })
  if checkout.code ~= 0 then
    vim.notify(
      'Failed to switch to ' .. branch .. ': ' .. (checkout.stderr or ''),
      vim.log.levels.ERROR
    )
    return
  end
  local pull = run({ 'git', 'pull' })
  if pull.code ~= 0 then
    vim.notify('Failed to pull: ' .. (pull.stderr or ''), vim.log.levels.ERROR)
    return
  end
  vim.notify('On ' .. branch, vim.log.levels.INFO)
end, {})

vim.api.nvim_create_user_command('Econf', function()
  vim.cmd('e ~/dotfiles/.config/nvim/init.lua')
end, {})

vim.api.nvim_create_user_command('Cp', function()
  vim.fn.setreg('+', vim.fn.expand('%'))
end, {})

vim.api.nvim_create_user_command('Gh', function()
  local remote = vim.system({ 'git', 'remote', 'get-url', 'origin' }):wait()
  if remote.code ~= 0 then
    vim.notify('Not a git repository or origin is not set', vim.log.levels.WARN)
    return
  end
  local base = vim.trim(remote.stdout)
  base = base:gsub('%.git$', '')
  base = base:gsub('^git@([^:]+):', 'https://%1/')
  base = base:gsub('^ssh://git@([^/]+)/', 'https://%1/')

  local head = vim.system({ 'git', 'symbolic-ref', '--short', 'refs/remotes/origin/HEAD' }):wait()
  local branch = 'master'
  if head.code == 0 then
    branch = vim.trim(head.stdout):gsub('^origin/', '')
  end

  local root = vim.trim(vim.system({ 'git', 'rev-parse', '--show-toplevel' }):wait().stdout)
  local file = vim.fn.expand('%:p'):sub(#root + 2)
  local line = vim.api.nvim_win_get_cursor(0)[1]
  vim.system({ 'open', string.format('%s/blob/%s/%s#L%d', base, branch, file, line) })
end, {})

if not in_vscode then
  vim.keymap.set('n', '<leader>g', function()
    if not vim.env.TMUX then
      vim.notify('Not inside tmux', vim.log.levels.WARN)
      return
    end
    local dir = vim.fn.expand('%:p:h')
    vim.fn.system({ 'tmux', 'new-window', '-c', dir, 'lazygit' })
  end, { noremap = true, silent = false })
end

function Tmux_split(command_to_run)
  if in_vscode then
    require('vscode_workflow').run_in_terminal(command_to_run)
    return
  end
  if not vim.env.TMUX then
    vim.notify('Not inside tmux', vim.log.levels.WARN)
    return
  end
  local own = vim.env.TMUX_PANE
  local function other_pane()
    local out = vim.fn.system({ 'tmux', 'list-panes', '-F', '#{pane_id}' })
    for id in out:gmatch('%S+') do
      if id ~= own then
        return id
      end
    end
  end

  local target = other_pane()
  if not target then
    vim.fn.system({ 'tmux', 'split-window', '-h', '-c', vim.fn.getcwd() })
    target = other_pane()
  end
  if not target then
    vim.notify('No tmux pane available to run the command in', vim.log.levels.ERROR)
    return
  end
  vim.fn.system({ 'tmux', 'send-keys', '-t', target, command_to_run, 'C-m' })
end

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
    .. 'if [ "$OPEN_PR_COUNT" -eq 0 ]; then gh pr create --fill --web; else gh pr view --web; fi'

  vim.system({ 'sh', '-c', '(' .. gh_command .. ') >/dev/null 2>&1' }, { cwd = file_dir })
end

if not in_vscode then
  vim.keymap.set(
    'n',
    '<leader>gp',
    open_or_create_pr,
    { desc = 'Open or create pull request', silent = true }
  )
end

if in_vscode then
  require('vscode_workflow').setup()
end

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
    cond = true,
    opts = { use_default_keymaps = false, max_join_length = 80 },
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
    lazy = false,
    dependencies = {
      'nvim-lua/plenary.nvim',
      { 'nvim-telescope/telescope-fzf-native.nvim', build = 'make' },
      { 'nvim-telescope/telescope-live-grep-args.nvim', version = '^1.0.0' },
      'nvim-telescope/telescope-frecency.nvim',
    },
    config = function()
      local telescope = require('telescope')
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
          frecency = {
            db_safe_mode = false,
          },
        },
      })

      telescope.load_extension('fzf')
      telescope.load_extension('frecency')
      telescope.load_extension('live_grep_args')
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
    'okuuva/auto-save.nvim',
    version = '^1.0.0',
    opts = {
      trigger_events = {
        immediate_save = {},
        defer_save = { 'InsertLeave' },
        cancel_deferred_save = { 'InsertEnter' },
      },
      debounce_delay = 135,
      condition = function(buf)
        return vim.bo[buf].filetype ~= 'harpoon'
      end,
    },
  },

  {
    'nvim-treesitter/nvim-treesitter',
    branch = 'main',
    lazy = false,
    build = ':TSUpdate',
    dependencies = { 'RRethy/nvim-treesitter-endwise' },
    config = function()
      local ts = require('nvim-treesitter')
      local wanted = {
        'bash',
        'diff',
        'go',
        'gomod',
        'groovy',
        'html',
        'json',
        'jsonnet',
        'lua',
        'luadoc',
        'markdown',
        'markdown_inline',
        'nix',
        'python',
        'query',
        'ruby',
        'vim',
        'vimdoc',
        'yaml',
      }
      local installed = ts.get_installed('parsers')
      local missing = vim.tbl_filter(function(lang)
        return not vim.tbl_contains(installed, lang)
      end, wanted)
      if #missing > 0 then
        ts.install(missing)
      end

      local available = ts.get_available()
      vim.api.nvim_create_autocmd('FileType', {
        group = vim.api.nvim_create_augroup('treesitter-start', { clear = true }),
        callback = function(ev)
          local lang = vim.treesitter.language.get_lang(ev.match)
          if not lang then
            return
          end

          local function start()
            if not vim.api.nvim_buf_is_valid(ev.buf) then
              return
            end
            if not pcall(vim.treesitter.start, ev.buf, lang) then
              return
            end
            if lang ~= 'ruby' then
              vim.bo[ev.buf].indentexpr = "v:lua.require'nvim-treesitter'.indentexpr()"
            end
          end

          if vim.tbl_contains(ts.get_installed('parsers'), lang) then
            start()
          elseif vim.tbl_contains(available, lang) then
            ts.install({ lang }):await(start)
          end
        end,
      })
    end,
  },

  {
    'hrsh7th/nvim-cmp',
    dependencies = {
      'hrsh7th/cmp-nvim-lsp',
      'hrsh7th/cmp-path',
      'hrsh7th/cmp-buffer',
    },
    config = function()
      local cmp = require('cmp')
      cmp.setup({
        completion = { completeopt = 'menu,menuone,noinsert' },
        snippet = {
          expand = function(args)
            vim.snippet.expand(args.body)
          end,
        },
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
      { 'mason-org/mason.nvim', opts = {} },
      'mason-org/mason-lspconfig.nvim',
      'WhoIsSethDaniel/mason-tool-installer.nvim',
      'hrsh7th/cmp-nvim-lsp',
    },
    config = function()
      vim.api.nvim_create_autocmd('LspAttach', {
        group = vim.api.nvim_create_augroup('lsp-attach', { clear = true }),
        callback = function(event)
          local map = function(keys, func, mode)
            vim.keymap.set(mode or 'n', keys, func, { buffer = event.buf })
          end

          map('gd', vim.lsp.buf.definition)
          map('<leader>rn', vim.lsp.buf.rename)
          map('<leader>.', vim.lsp.buf.code_action, { 'n', 'x' })
          map('<leader>h', vim.lsp.buf.hover)
          map('<leader>en', function()
            vim.diagnostic.jump({ count = 1, float = true })
          end)
          map('<leader>ep', function()
            vim.diagnostic.jump({ count = -1, float = true })
          end)
        end,
      })

      vim.diagnostic.config({
        virtual_text = true,
        signs = false,
        underline = false,
        update_in_insert = false,
      })

      vim.lsp.config('*', {
        capabilities = require('cmp_nvim_lsp').default_capabilities(),
      })

      vim.lsp.config('ruby_lsp', {
        cmd = { 'mise', 'x', '--', 'ruby-lsp' },
      })

      vim.lsp.config('lua_ls', {
        settings = {
          Lua = {
            runtime = { version = 'LuaJIT' },
            workspace = {
              checkThirdParty = false,
              library = { vim.env.VIMRUNTIME },
            },
          },
        },
      })

      require('mason-lspconfig').setup({
        ensure_installed = { 'yamlls', 'gopls', 'groovyls', 'pyright', 'jsonnet_ls', 'lua_ls' },
        automatic_enable = { exclude = { 'ruby_lsp', 'stylua' } },
      })

      require('mason-tool-installer').setup({
        ensure_installed = { 'stylua', 'yamlfmt' },
      })

      vim.lsp.enable('ruby_lsp')
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
    dir = vim.fn.expand('~/vinted/worktree-cli'),
    name = 'gwt',
    lazy = false,
    cond = function()
      return not in_vscode and vim.fn.isdirectory(vim.fn.expand('~/vinted/worktree-cli')) == 1
    end,
    config = function()
      require('gwt').setup()
    end,
  },
}, {
  rocks = { enabled = false },
  defaults = { cond = not in_vscode },
})
