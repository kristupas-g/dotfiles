;;; user-interface.el --- User interface configuration
;;; Code:

(use-package doom-themes
  :config
  (load-theme 'doom-gruvbox t))

(use-package doom-modeline
  :config
  (setq doom-modeline-height 2)
  (setq doom-modeline-major-mode-icon nil)
  (setq doom-modeline-buffer-encoding nil)
  (doom-modeline-mode 1))

(use-package which-key
  :init (which-key-mode 1)
  :config (setq which-key-idle-delay 0.3))

(provide 'user-interface)

;;; user-interface.el ends here
