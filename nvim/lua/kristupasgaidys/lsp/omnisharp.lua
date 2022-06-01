local capabilities = require("cmp_nvim_lsp").update_capabilities(vim.lsp.protocol.make_client_capabilities())
local pid = vim.fn.getpid()
local omnisharp_bin = ( vim.fn.stdpath "data" .. "/lsp_servers/omnisharp/omnisharp/Omnisharp" )

require("lspconfig").omnisharp.setup({
  cmd = {
    omnisharp_bin,
    "--languageserver" ,
    "--hostPID",
    tostring(pid)
  },
	capabilities = capabilities,
	on_attach = Lsp_base_bindings
})

