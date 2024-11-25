(use-package corfu
  :custom
  (corfu-cycle t)
  (corfu-auto t)
  (corfu-quit-no-match t)
  (corfu-preview-current t)
  (corfu-scroll-margin 6)
  (corfu-echo-mode t)
  (corfu-auto-delay t)
  :config (global-corfu-mode))

(use-package treesit-auto
  :config (global-treesit-auto-mode))

(use-package eglot
  :hook ((python-ts-mode . eglot-ensure)
         (csharp-ts-mode . eglot-ensure)
         (json-ts-mode . eglot-ensure)
         (rust-ts-mode . eglot-ensure)
         (go-ts-mode . eglot-ensure)
         (bash-ts-mode . eglot-ensure)))

(use-package lsp-mode
  :disabled t
  :config
  (setq lsp-enable-which-key-integration t
        lsp-keymap-prefix "SPC c"
        lsp-log-io t)
  :hook ((csharp-ts-mode . lsp-deferred)
         (json-ts-mode . lsp-deferred)
         (rust-ts-mode . lsp-deferred)
         (go-ts-mode . lsp-deferred)
         (bash-ts-mode . lsp-deferred)))

(use-package lsp-pyright
  :disabled t
  :hook (python-ts-mode . lsp-deferred))

(use-package lsp-ui
  :disabled t
  :config
  (setq lsp-ui-sideline-delay 0
        lsp-ui-doc-position 'bottom)
  :hook (lsp-mode . lsp-ui-mode))

(use-package dap-mode
  :disabled t)


(provide 'coding)
