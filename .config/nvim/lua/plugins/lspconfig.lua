local servers = {
	"bashls",
	"gopls",
	"clangd",
	"rust_analyzer",
	"omnisharp",
	"pyright",
	"texlab",
	"jsonls",
	"tsserver",
	"marksman",
	-- "fennel-language-server",
}

return {
	"neovim/nvim-lspconfig",
	dependencies = {
		"nvim-lua/plenary.nvim",
		{ "williamboman/mason.nvim",           config = true },
		{ "williamboman/mason-lspconfig.nvim", opts = { ensure_installed = servers } },
	},
	config = function()
		local capabilities = require("cmp_nvim_lsp").default_capabilities()

		local lsp = require("lspconfig")

		for _, server in pairs(servers) do
			lsp[server].setup({
				capabilities = capabilities,
				on_attach = function(client, bufnr)
					if client.name == "omnisharp" then
						client.server_capabilities.semanticTokensProvider = {
							full = vim.empty_dict(),
							legend = {
								tokenModifiers = { "static_symbol" },
								tokenTypes = {
									"comment",
									"excluded_code",
									"identifier",
									"keyword",
									"keyword_control",
									"number",
									"operator",
									"operator_overloaded",
									"preprocessor_keyword",
									"string",
									"whitespace",
									"text",
									"static_symbol",
									"preprocessor_text",
									"punctuation",
									"string_verbatim",
									"string_escape_character",
									"class_name",
									"delegate_name",
									"enum_name",
									"interface_name",
									"module_name",
									"struct_name",
									"type_parameter_name",
									"field_name",
									"enum_member_name",
									"constant_name",
									"local_name",
									"parameter_name",
									"method_name",
									"extension_method_name",
									"property_name",
									"event_name",
									"namespace_name",
									"label_name",
									"xml_doc_comment_attribute_name",
									"xml_doc_comment_attribute_quotes",
									"xml_doc_comment_attribute_value",
									"xml_doc_comment_cdata_section",
									"xml_doc_comment_comment",
									"xml_doc_comment_delimiter",
									"xml_doc_comment_entity_reference",
									"xml_doc_comment_name",
									"xml_doc_comment_processing_instruction",
									"xml_doc_comment_text",
									"xml_literal_attribute_name",
									"xml_literal_attribute_quotes",
									"xml_literal_attribute_value",
									"xml_literal_cdata_section",
									"xml_literal_comment",
									"xml_literal_delimiter",
									"xml_literal_embedded_expression",
									"xml_literal_entity_reference",
									"xml_literal_name",
									"xml_literal_processing_instruction",
									"xml_literal_text",
									"regex_comment",
									"regex_character_class",
									"regex_anchor",
									"regex_quantifier",
									"regex_grouping",
									"regex_alternation",
									"regex_text",
									"regex_self_escaped_character",
									"regex_other_escape",
								},
							},
							range = true,
						}
					end
					Lsp_base_bindings(client, bufnr)
				end,
			})
		end

		require("plugins.lsp_servers.lua_ls")

		vim.diagnostic.config({
			virtual_text = true,
			underline = false,
			signs = false,
			severity_sort = true,
		})

		local handlers = vim.lsp.handlers

		handlers["textDocument/hover"] = vim.lsp.with(vim.lsp.handlers.hover, { border = "rounded" })
		handlers["textDocument/signatureHelp"] = vim.lsp.with(handlers.signature_help, { border = "rounded" })
		vim.diagnostic._set_virtual_text = vim.lsp.with(vim.diagnostic._set_virtual_text, {})
	end,
}
