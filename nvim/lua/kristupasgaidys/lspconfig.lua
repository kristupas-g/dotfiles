local lsp = require('lspconfig')
local capabilities = require('cmp_nvim_lsp').update_capabilities(vim.lsp.protocol.make_client_capabilities())


vim.diagnostic.config({
  virtual_text = true,
  underline = false,
  signs = false,
})

lsp.eslint.setup {
    cmd = { "vscode-eslint-language-server", "--stdio" },
    settings = {
      codeAction = {
        disableRuleComment = {
          enable = false,
          location = "separateLine"
        },
        showDocumentation = {
          enable = false
        }
      },
      codeActionOnSave = {
        enable = false,
        mode = "all"
      },
      format = false,
      nodePath = "",
      onIgnoredFiles = "off",
      packageManager = "yarn",
      quiet = false,
      rulesCustomizations = {},
      run = "onType",
      useESLintClass = false,
      validate = "on",
      workingDirectory = {
        mode = "location"
      }
    }
}

lsp.tsserver.setup({
    init_options = require("nvim-lsp-ts-utils").init_options,

    capabilities = capabilities,

    on_attach = function(client, bufnr)
        local ts_utils = require("nvim-lsp-ts-utils")
        client.resolved_capabilities.document_formatting = true
        client.resolved_capabilities.document_range_formatting = false
        
        ts_utils.setup {
        debug = false,
        disable_commands = false,
        enable_import_on_completion = true,
        import_all_timeout = 5000, -- ms
        auto_inlay_hints = false,
        -- eslint
        eslint_enable_code_actions = true,
        eslint_enable_disable_comments = false,
        eslint_bin = 'eslint_d',
        eslint_config_fallback = nil,
        eslint_enable_diagnostics = true,
        eslint_opts = {
          -- diagnostics_format = "#{m} [#{c}]",
          condition = function(utils)
              return utils.root_has_file(".eslintrc")
          end,
        },
        -- formatting
        enable_formatting = true,
        formatter = 'prettierd',
        formatter_config_fallback = nil,
        -- parentheses completion
        complete_parens = false,
        signature_help_in_parens = true,
        -- update imports on file move
        update_imports_on_move = true,
        require_confirmation_on_move = false,
        watch_dir = nil,
        -- filter diagnostics
        filter_out_diagnostics_by_severity = { "hint" },
        filter_out_diagnostics_by_code = {},
    }

    ts_utils.setup_client(client)

    end,
})


lsp.jsonls.setup {
  on_attach = on_attach,
  capabilities = capabilities,
  settings = {
    json = {
      schemas = {
        {
          fileMatch = { 'package.json' },
          url = 'https://json.schemastore.org/package.json',
        },
        {
          fileMatch = { 'tsconfig.json', 'tsconfig.*.json' },
          url = 'http://json.schemastore.org/tsconfig',
        },
        {
          fileMatch = { '.eslintrc.json', '.eslintrc' },
          url = 'http://json.schemastore.org/eslintrc',
        },
        {
          fileMatch = { '.prettierrc', '.prettierrc.json', 'prettier.config.json' },
          url = 'http://json.schemastore.org/prettierrc',
        },
        {
          fileMatch = { 'deno.json' },
          url = 'https://raw.githubusercontent.com/denoland/deno/main/cli/schemas/config-file.v1.json',
        },
      },
    },
  },
}

local pid = vim.fn.getpid()
local omnisharp_bin = "/Users/kristupasgaidys/Downloads/omnisharp-osx-arm64-net6.0/OmniSharp"
lsp.omnisharp.setup{
    capabilities = capabilities,
    cmd = { omnisharp_bin, "--languageserver" , "--hostPID", tostring(pid) };
}

lsp.clangd.setup{
  cmd ={"/Library/Developer/CommandLineTools/usr/bin/clangd"}
}

lsp.gopls.setup{
  cmd={"/Users/kristupasgaidys/go/bin/gopls"}
}

lsp.rust_analyzer.setup{ cmd={"rust-analyzer"}}

lsp.html.setup{}
lsp.cssls.setup{}
