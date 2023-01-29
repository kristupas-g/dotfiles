return {
  {
    "catppuccin/nvim",
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
}
