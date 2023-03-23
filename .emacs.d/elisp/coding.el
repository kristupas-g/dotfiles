(use-package corfu
  :custom
  (corfu-cycle t)
  (corfu-auto t)
  ;; (corfu-quit-no-match t)
  ;; (corfu-preview-current t)
  ;; (corfu-scroll-margin 6)
  ;; (corfu-echo-mode t)
  ;; (corfu-auto-delay t)
  ;; (corfu-echo-delay t)
  :init (global-corfu-mode))

(use-package treesit-auto
  :config (setq treesit-auto-install 'prompt)
  :init (global-treesit-auto-mode))

(use-package eglot
  :hook ((python-ts-mode . eglot-ensure)
         (csharp-ts-mode . eglot-ensure)
         (json-ts-mode . eglot-ensure)
         (rust-ts-mode . eglot-ensure)
         (go-ts-mode . eglot-ensure)
         (bash-ts-mode . eglot-ensure)))

