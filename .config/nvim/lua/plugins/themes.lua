return {
  {
    "catppuccin/nvim",
    enabled = false,
    opts = {
      flavour = "mocha",
      styles = {
        comments = { "italic" },
        conditionals = { "italic" },
        loops = {},
        functions = {},
        keywords = {},
        strings = {},
        variables = {},
        numbers = {},
        booleans = {},
        properties = {},
        types = {},
        operators = {},
      },
      transperent_background = true,
    },
    config = function()
      vim.cmd.colorscheme("catppuccin")
    end,
  },
  {
    "bluz71/vim-moonfly-colors",
    name = "moonfly",
    config = function()
      vim.g.moonflyTransparent = true
      vim.cmd.colorscheme("moonfly")
    end,
  },
}
