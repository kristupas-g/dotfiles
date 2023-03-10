;;; git.el --- Git configuration
;;; Code:

(use-package magit
  :commands magit-status
  :custom (magit-display-buffer-function #'magit-display-buffer-same-window-except-diff-v1))

(provide 'git)

;;; git.el ends here
