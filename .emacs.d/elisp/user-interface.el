;;; user-interface.el --- User interface configuration
;;; Code:

(use-package catppuccin-theme
  :config (setq catppuccin-flavor 'macchiato)
  :init (load-theme 'catppuccin t))

(use-package timu-spacegrey-theme
  :disabled t
  :config
  (load-theme 'timu-spacegrey t))

(use-package doom-themes
  :disabled t
  :config
  (load-theme 'doom-one t))

(use-package doom-modeline
  :config (doom-modeline-mode 1)
  :init (setq doom-modeline-height 2)
  (setq doom-modeline-major-mode-icon nil)
  (setq doom-modeline-buffer-encoding nil))

(use-package all-the-icons
  :if (display-graphic-p))

(use-package rainbow-delimiters
  :hook prog-mode)

(use-package highlight-indent-guides
  :hook prog-mode
  :init (setq highlight-indent-guides-method 'character))

(use-package which-key
  :init (which-key-mode 1)
  :config (setq which-key-idle-delay 0.3))

(provide 'user-interface)

;;; user-interface.el ends here
