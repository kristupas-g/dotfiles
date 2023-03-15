return {
  "catppuccin/nvim",
  name = "catppuccin",
  lazy = false,
  priority = 100000,
  config = function()
    require("catppuccin").setup({
      flavour = "macchiato",
    })

    vim.cmd.colorscheme("catppuccin")
  end,
}
