return {
  "klen/nvim-test",
  opts = {
    run = true, -- run tests (using for debug)
    commands_create = true, -- create commands (TestFile, TestLast, ...)
    filename_modifier = ":.", -- modify filenames before tests run(:h filename-modifiers)
    silent = true, -- less notifications
    term = "terminal", -- a terminal to run ("terminal"|"toggleterm")
    termOpts = {
      direction = "horizontal", -- terminal's direction ("horizontal"|"vertical"|"float")
      width = 96, -- terminal's width (for vertical|float)
      height = 12, -- terminal's height (for horizontal|float)
      go_back = true, -- return focus to original window after executing
      stopinsert = "true", -- exit from insert mode (true|false|"auto")
      keep_one = true, -- keep only one terminal for testing
    },
  },
}
