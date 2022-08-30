require("kristupasgaidys.disables")
require("kristupasgaidys.settings")
require("kristupasgaidys.keymaps")
require("kristupasgaidys.statusline")
require("kristupasgaidys.lua_locals").init()
require("kristupasgaidys.autocmds")

require("packer").startup(function(use)
	use("wbthomason/packer.nvim")

	use("sainnhe/everforest")
	use("Mofiqul/adwaita.nvim")
	use("bluz71/vim-moonfly-colors")
	use({ "catppuccin/nvim", as = "catppuccin" })

	use({
		"lewis6991/impatient.nvim",
		config = function()
			require("impatient")
		end,
	})

	use({ "kyazdani42/nvim-web-devicons" })

	use({
		"kylechui/nvim-surround",
		config = function()
			require("kristupasgaidys.surround")
		end,
	})

	use({
		"ggandor/lightspeed.nvim",
		config = function()
			require("kristupasgaidys.lightspeed")
		end,
	})

	use({
		"numToStr/Comment.nvim",
		config = function()
			require("kristupasgaidys.comment")
		end,
	})

	use({
		"windwp/nvim-autopairs",
		config = function()
			require("nvim-autopairs").setup({})
		end,
	})

	use({
		"nmac427/guess-indent.nvim",
		config = function()
			require("guess-indent").setup({})
		end,
	})

	use({
		"lukas-reineke/indent-blankline.nvim",
		config = function()
			require("kristupasgaidys.indent-blankline")
		end,
	})

	use({
		"nvim-telescope/telescope.nvim",
		requires = {
			"nvim-lua/plenary.nvim",
			{
				"nvim-telescope/telescope-fzf-native.nvim",
				after = { "telescope.nvim" },
				config = function()
					require("telescope").load_extension("fzf")
				end,
				run = "make",
			},
		},
		config = function()
			require("kristupasgaidys.tele_scope")
		end,
	})

	use({
		"kyazdani42/nvim-tree.lua",
		disabled = true,
		requires = "kyazdani42/nvim-web-devicons",
		config = function()
			require("kristupasgaidys.nvim-tree")
		end,
	})

	use({
		"folke/trouble.nvim",
		requires = "kyazdani42/nvim-web-devicons",
		config = function()
			require("kristupasgaidys.trouble")
		end,
	})

	use({
		"williamboman/mason.nvim",
		requires = {
			"jose-elias-alvarez/nvim-lsp-ts-utils",
			"nvim-lua/plenary.nvim",
			"williamboman/mason-lspconfig.nvim",
			"neovim/nvim-lspconfig",
		},
		config = function()
			require("kristupasgaidys.lspconfig")
		end,
	})

	use({
		"nvim-treesitter/nvim-treesitter",
		requires = {
			"p00f/nvim-ts-rainbow",
			"windwp/nvim-ts-autotag",
			"JoosepAlviste/nvim-ts-context-commentstring",
			"windwp/nvim-ts-autotag",
		},
		config = function()
			require("kristupasgaidys.treesitter")
		end,
	})

	use({
		"L3MON4D3/LuaSnip",
		after = { "nvim-lspconfig" },
		requires = "saadparwaiz1/cmp_luasnip",
	})

	use({
		"TimUntersberger/neogit",
		disable = true,
		requires = { "nvim-lua/plenary.nvim" },
		config = function()
			require("kristupasgaidys.neogit")
		end,
	})

	use({
		"folke/which-key.nvim",
		config = function()
			require("kristupasgaidys.which-key")
		end,
	})

	use({
		"ThePrimeagen/harpoon",
		config = function()
			require("kristupasgaidys.harpoon")
		end,
	})

	use({
		"mfussenegger/nvim-dap",
		requires = {
			"theHamsta/nvim-dap-virtual-text",
			"rcarriga/nvim-dap-ui",
		},
		config = function()
			require("kristupasgaidys.dap")
		end,
	})

	use({
		"hrsh7th/nvim-cmp",
		requires = {
			"hrsh7th/cmp-buffer",
			"hrsh7th/cmp-path",
			"hrsh7th/cmp-nvim-lsp",
			"hrsh7th/cmp-cmdline",
			"onsails/lspkind-nvim",
			"hrsh7th/cmp-nvim-lsp-signature-help",
		},
		config = function()
			require("kristupasgaidys.cmp")
		end,
	})

	use({
		"jose-elias-alvarez/null-ls.nvim",
		after = { "nvim-lspconfig" },
		requires = "nvim-lua/plenary.nvim",
		config = function()
			require("kristupasgaidys.null-ls")
		end,
	})

	use({
		"hkupty/iron.nvim",
		config = function()
			require("kristupasgaidys.iron")
		end,
	})

	use({
		"phaazon/mind.nvim",
		config = function()
			require("mind").setup()
		end,
	})

	require("kristupasgaidys.git")
end)
