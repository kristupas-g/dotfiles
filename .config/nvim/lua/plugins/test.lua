return {
  "klen/nvim-test",
  opts = {
    run = true,
    commands_create = false,
    filename_modifier = ":.",
    silent = true,
    term = "terminal",
    termOpts = {
      direction = "horizontal",
      width = 96,
      height = 12,
      go_back = true,
      stopinsert = "true",
      keep_one = true,
    },
  },
}
