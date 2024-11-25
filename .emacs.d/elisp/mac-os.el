;;; mac-os.el --- Working with macos
;;; Code:

(use-package exec-path-from-shell
  :config (when (memq window-system '(mac ns x))
            (exec-path-from-shell-initialize)))

(setq mac-option-key-is-meta nil mac-command-key-is-meta t mac-command-modifier 'meta mac-option-modifier 'none)

(provide 'mac-os)

;;; mac-os.el ends here
