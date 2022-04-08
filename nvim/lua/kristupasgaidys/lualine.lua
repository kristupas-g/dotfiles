require('lualine').setup{
  options = {
    icons_enabled = true,
    theme = "tokyonight",
    component_separators = { left = '', right = ''},
    section_separators = { left = '', right = ''},
    always_divide_middle = true,
    padding = 2,
  },
  sections = {
    lualine_a = {'filename'},
    lualine_b = {},
    lualine_c = {},
    lualine_x = {},
    lualine_y = {},
    lualine_z = {'diagnostics'}
  },
  tabline = {},
  extensions = {}
}
