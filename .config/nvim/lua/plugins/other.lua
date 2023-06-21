return {
  "rgroli/other.nvim",
  config = function()
    require("other-nvim").setup({
      mappings = {
        "rails",
      },
      transformers = {
        lowercase = function(inputString)
          return inputString:lower()
        end,
      },
      style = {
        border = "solid",
        seperator = "|",
        width = 0.7,
        minHeight = 2,
      },
    })
  end
}
