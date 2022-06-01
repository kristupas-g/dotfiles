require("packer").startup(function(use)
	use("wbthomason/packer.nvim")

	use("sainnhe/gruvbox-material")
	use("tpope/vim-surround")

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
		"lukas-reineke/indent-blankline.nvim",
		config = function()
			require("kristupasgaidys.indent-blankline")
		end,
	})

	use({
		"akinsho/bufferline.nvim",
		requires = "kyazdani42/nvim-web-devicons",
		config = function()
			require("kristupasgaidys.bufferline")
		end,
	})

	use({
		{
			"nvim-telescope/telescope-fzf-native.nvim",
			run = "make",
		},
		"nvim-telescope/telescope.nvim",
		requires = "nvim-lua/plenary.nvim",
		config = function()
			require("kristupasgaidys.telescope")
		end,
	})

	use({
		"kyazdani42/nvim-tree.lua",
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
		"williamboman/nvim-lsp-installer",
		{
			"neovim/nvim-lspconfig",
			requires = { "jose-elias-alvarez/nvim-lsp-ts-utils", "nvim-lua/plenary.nvim" },
			config = function()
				require("kristupasgaidys.lsp-installer")
				require("kristupasgaidys.lspconfig")
			end,
		},
	})

	use({
		"nvim-treesitter/nvim-treesitter",
		requires = {
			"p00f/nvim-ts-rainbow",
			"JoosepAlviste/nvim-ts-context-commentstring",
			"windwp/nvim-ts-autotag",
		},
		config = function()
			require("kristupasgaidys.treesitter")
		end,
	})

	use({
		"L3MON4D3/LuaSnip",
		requires = "saadparwaiz1/cmp_luasnip",
		disable = true,
	})

	use({
		"TimUntersberger/neogit",
		requires = {
			"nvim-lua/plenary.nvim",
			"sindrets/diffview.nvim",
		},
		config = function()
			require("kristupasgaidys.neogit")
		end,
		disable = true,
	})

	use({
		"akinsho/git-conflict.nvim",
		config = function()
			require("git-conflict").setup()
		end,
		disable = true,
		-- TODO make an autocommand for git conflict stuff
	})

	use({
		"ggandor /leap.nvim",
		disable = true,
	})

	use({
		"folke/which-key.nvim",
		config = function() end,
		disable = true,
	})

	use({
		"hrsh7th/nvim-cmp",
		requires = {
			"hrsh7th/cmp-buffer",
			"hrsh7th/cmp-path",
			"hrsh7th/cmp-nvim-lsp",
			"hrsh7th/cmp-cmdline",
			"onsails/lspkind-nvim",
		},
		config = function()
			require("kristupasgaidys.cmp")
		end,
	})

	use("prettier/vim-prettier")
	use("editorconfig/editorconfig-vim")
	use({
		"ckipp01/stylua-nvim",
		run = "cargo install stylua",
	})
end)

require("kristupasgaidys.settings")
require("kristupasgaidys.keymaps")
