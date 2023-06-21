Lsp_base_bindings = function(client, bufnr)
	-- We can see if it supports the capability
	--Print(client)
	local telescope_builtin = require("telescope.builtin")
	local test = require("nvim-test")
	local lsp_buf = vim.lsp.buf
	local diagnostics = vim.diagnostic

	local lsp_bind = function(keymap, command, desc)
		local opts = { noremap = true, silent = true, buffer = bufnr, desc = desc }
		vim.keymap.set("n", keymap, command, opts)
	end

	lsp_bind("gd", lsp_buf.definition, "Go to definition")
	lsp_bind("<leader>ch", lsp_buf.hover, "Hover")
	lsp_bind("<leader>cs", lsp_buf.signature_help, "Signature help")
	lsp_bind("<leader>ct", lsp_buf.type_definition, "Type definition")
	lsp_bind("<leader>cR", lsp_buf.rename, "Rename symbol")
	lsp_bind("<leader>ca", lsp_buf.code_action, "Code action")

	lsp_bind("<leader>ee", diagnostics.open_float, "Show error")
	lsp_bind("<leader>en", diagnostics.goto_next, "Show error")
	lsp_bind("<leader>ep", diagnostics.goto_prev, "Show error")
	lsp_bind("<leader>E", "<cmd>Trouble<CR>", "All errors")

	lsp_bind("<leader>cf", telescope_builtin.live_grep, "Search code")
	lsp_bind("<leader>cr", telescope_builtin.lsp_references, "Show references")
	lsp_bind("<leader>ci", telescope_builtin.lsp_implementations, "Show implementations")

	lsp_bind("<leader>tf", function()
		test.run("file")
	end, "Run tests in the file")
	lsp_bind("<leader>tl", test.run_last, "Run last test")
	lsp_bind("<leader>tp", function()
		test.run("nearest")
	end, "Run nearest test")
	lsp_bind("<leader>ts", function()
		test.run("suite")
	end, "Run test suite")
	lsp_bind("<leader>te", test.edit, "Edit test")

	lsp_bind("<leader>oo", "<cmd>:Other<CR>")
	lsp_bind("<leader>os", "<cmd>:OtherSplit<CR>")
	lsp_bind("<leader>ov", "<cmd>:OtherVSplit<CR>")
	lsp_bind("<leader>oc", "<cmd>:OtherClear<CR>")
	lsp_bind("<leader>ot", "<cmd>:Other test<CR>")
end
