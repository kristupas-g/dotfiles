;;; user-interface.el --- User interface configuration
;;; Code:

(use-package catppuccin-theme
  :disabled t
  :init (setq catppuccin-flavor 'macchiato)
  :config (load-theme 'catppuccin t))

(use-package timu-spacegrey-theme
  :disabled t
  :config
  (load-theme 'timu-spacegrey t))

(use-package doom-themes
  :config
  (load-theme 'doom-dracula t))

(use-package doom-modeline
  :config
  (setq doom-modeline-height 2)
  (setq doom-modeline-major-mode-icon nil)
  (setq doom-modeline-buffer-encoding nil)
  (doom-modeline-mode 1))

(use-package all-the-icons
  :if (display-graphic-p))

(use-package rainbow-delimiters
  :hook prog-mode)

(use-package highlight-indent-guides
  :disabled t
  :hook prog-mode
  :init (setq highlight-indent-guides-method 'character))

(use-package which-key
  :init (which-key-mode 1)
  :config (setq which-key-idle-delay 0.3))

(provide 'user-interface)

;;; user-interface.el ends here
