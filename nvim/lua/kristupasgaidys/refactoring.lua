local telescope = require("telescope")

telescope.load_extension("refactoring")

normal("<leader>cA", telescope.extensions.refactoring.refactors, "Refactor")
