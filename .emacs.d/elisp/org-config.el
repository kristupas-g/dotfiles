;;; org-config.el --- Org configuration
;;; Code:

;; Org agenda
;; Org attach
;; Org capture

(org
  "c" #'org-capture
  "a" #'org-agenda
  "s" #'org-schedule
  "d" #'org-deadline
  "r" #'org-roam-node-find)

(general-define-key
 :states  'normal
 :keymaps 'org-mode-map
 "RET" #'org-open-at-point)

(defun kg/org-additional-modes ()
  (org-indent-mode 1)
;;  (variable-pitch-mode 1)
  (auto-fill-mode 1))

(use-package org
  :custom
  (org-default-notes-file (concat org-directory "/notes.org"))
  :hook (org-mode . kg/org-additional-modes))

(require 'org-indent)

(use-package org-superstar
  :hook (org-mode . org-superstar-mode))

(use-package org-roam
  :custom
  (org-roam-directory (concat org-directory "/roam"))
  :init
  (org-roam-db-autosync-mode))


(provide 'org-config)

;;; org-config.el ends here
