;;; git.el --- Git configuration
;;; Code:

(use-package magit
  :general
  (git
    "s" 'magit-status))

(provide 'git)

;;; git.el ends here
