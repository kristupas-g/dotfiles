local cmp = require("cmp")
local lspkind = require("lspkind")

cmp.setup({
	snippet = {
		expand = function(args)
			require("luasnip").lsp_expand(args.body)
		end,
	},
	mapping = {
		["<C-j>"] = cmp.mapping(cmp.mapping.scroll_docs(-4), { "i", "c" }),
		["<C-k>"] = cmp.mapping(cmp.mapping.scroll_docs(4), { "i", "c" }),
		["<Down>"] = cmp.mapping(cmp.mapping.select_next_item(), { "i", "c" }),
		["<Up>"] = cmp.mapping(cmp.mapping.select_prev_item(), { "i", "c" }),
		["<esc>"] = cmp.mapping({
			i = cmp.mapping.abort(),
			c = cmp.mapping.close(),
		}),
		["<Right>"] = cmp.mapping.confirm({ select = true }),
	},
	experimental = {
		native_menu = false,
		ghost_text = true,
	},
	formatting = {
		format = lspkind.cmp_format({
			mode = "symbol_text",
			maxwidth = 50,
		}),
	},
	sources = cmp.config.sources({
		{ name = "nvim_lsp" },
		{ name = "luasnip" },
		{ name = "org" },
		{ name = "buffer" },
		{ name = "path" },
	}),
})
cmp.setup.cmdline(":", {
	sources = {
		{ name = "cmdline" },
	},
})
