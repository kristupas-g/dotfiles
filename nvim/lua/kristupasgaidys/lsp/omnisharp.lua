local omnisharp_bin = "/Users/kristupasgaidys/Downloads/omnisharp-osx-arm64-net6.0/OmniSharp"
local pid = vim.fn.getpid()
local capabilities = require("cmp_nvim_lsp").update_capabilities(vim.lsp.protocol.make_client_capabilities())

lsp.omnisharp.setup({
	capabilities = capabilities,
	cmd = { 
    omnisharp_bin,
    "--languageserver",
    "--hostPID",
    tostring(pid)
  },
})

