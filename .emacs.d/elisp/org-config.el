;;; org-config.el --- Org configuration
;;; Code:

(use-package org-roam
  :disabled t
  :custom
  (org-roam-directory "~/Org")
  (org-roam-complete-everywhere t)
  :init
  (org-roam-db-autosync-mode))

(use-package org
  :init
  ;;(org-indent-mode)
  (variable-pitch-mode 1)
  (auto-fill-mode 0)
  :config
  (setq org-ellipsis " ▾"
        org-hide-emphasis-markers t))

(use-package org-bullets
  :after org
  :hook (org-mode . org-bullets-mode))

;; (require 'org-indent)

(provide 'org-config)

;;; org-config.el ends here
