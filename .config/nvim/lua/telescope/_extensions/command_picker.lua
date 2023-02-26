return require("telescope").register_extension({
  setup = function(ext_config, config)
    -- return vim.tbl_deep_extend("force", config, ext_config or {})
  end,
  exports = {
    command_picker = require("personal.lua_locals.telescope").get_command,
  },
})
