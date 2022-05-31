require("nvim-lsp-installer").setup({
    automatic_installation = true, 
    ensure_installed = {
      "tsserver",
      "sumneko_lua",
      "bashls",
      "clangd",
      "omnisharp",
      "cssls",
      "eslint",
      "gopls",
      "html",
      "jsonls",
      "jdtls",
      "sqlls"
    }
})
