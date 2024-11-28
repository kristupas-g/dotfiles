(use-package corfu
  :custom
  ;; (corfu-cycle t)
  ;; (corfu-auto t)
  ;; (corfu-quit-no-match t)
  ;; (corfu-preview-current t)
  ;; (corfu-scroll-margin 6)
  ;; (corfu-echo-mode t)
  ;; (corfu-auto-delay t)
  :config (global-corfu-mode))

;(use-package treesit-auto
;  :config (global-treesit-auto-mode))

(use-package eglot
  :hook ((python-ts-mode . eglot-ensure)
         (json-ts-mode . eglot-ensure)
         (rust-ts-mode . eglot-ensure)
         (go-ts-mode . eglot-ensure)
         (ruby-ts-mode . eglot-ensure)
         (bash-ts-mode . eglot-ensure))
  :config
  (add-to-list 'eglot-server-programs '((ruby-mode ruby-ts-mode) ("bundle" "exec" "ruby-lsp")))
)

(use-package flycheck
  :config
  (setq flycheck-ruby-rubocop-executable "bundle exec rubocop")
  (add-hook 'after-init-hook #'global-flycheck-mode))

(provide 'coding)
