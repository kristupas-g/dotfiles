require("kristupasgaidys.settings")
require("kristupasgaidys.keymaps")

require("packer").startup(function(use)
	use("wbthomason/packer.nvim")

	use("sainnhe/gruvbox-material")

	use({
		"xiyaowong/nvim-transparent",
		config = function()
			require("kristupasgaidys.transparent")
		end,
	})

	use("tpope/vim-surround")

	use({ "ggandor/lightspeed.nvim" })

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
		"nvim-telescope/telescope.nvim",
		requires = "nvim-lua/plenary.nvim",
		config = function()
			require("kristupasgaidys.tele_scope")
		end,
	})

	use({
		"nvim-telescope/telescope-fzf-native.nvim",
		after = { "telescope.nvim" },
		config = function()
			require("telescope").load_extension("fzf")
		end,
		run = "make",
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
		cmd = { "Trouble" },
		requires = "kyazdani42/nvim-web-devicons",
		config = function()
			require("kristupasgaidys.trouble")
		end,
	})

	use({
		"williamboman/nvim-lsp-installer",
		{
			"neovim/nvim-lspconfig",
			cmd = { "LspInstall" },
			requires = {
				"jose-elias-alvarez/nvim-lsp-ts-utils",
				"nvim-lua/plenary.nvim",
			},
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
		after = { "nvim-lspconfig" },
		requires = "saadparwaiz1/cmp_luasnip",
	})

	use({
		"sindrets/diffview.nvim",
		cmd = { "DiffviewOpen" },
		config = function()
			require("kristupasgaidys.diffview")
		end,
	})

	use({
		"TimUntersberger/neogit",
		requires = { "nvim-lua/plenary.nvim" },
		config = function()
			require("kristupasgaidys.neogit")
		end,
	})

	use({
		"akinsho/git-conflict.nvim",
		config = function()
			require("kristupasgaidys.git-conflict")
		end,
	})

	use({
		"ThePrimeagen/git-worktree.nvim",
		requires = {
			"nvim-lua/plenary.nvim",
			"nvim-telescope/telescope.nvim",
		},
		after = { "telescope.nvim" },
		config = function()
			require("kristupasgaidys.worktree")
			require("telescope").load_extension("git_worktree")
		end,
	})

	use({
		"folke/which-key.nvim",
		config = function()
			require("kristupasgaidys.which-key")
		end,
	})

	use({
		"nvim-orgmode/orgmode",
		ft = { "org" },
		requires = {
			"nvim-treesitter/nvim-treesitter",
			"lukas-reineke/headlines.nvim",
			"akinsho/org-bullets.nvim",
		},
		config = function()
			require("kristupasgaidys.org")
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
end)
