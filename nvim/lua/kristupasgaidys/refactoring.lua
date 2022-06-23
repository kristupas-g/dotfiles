local telescope = require("telescope")
telescope.load_extension("refactoring")

normal("<leader>A", telescope.extensions.refactoring.refactors, "Refactor")
