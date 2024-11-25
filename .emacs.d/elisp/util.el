;;; util.el --- Utility functions
;;; Code:

(defun goto-personal-config ()
  (interactive)
   (find-file (concat user-emacs-directory "init.el")))

(provide 'util)

;;; util.el ends here
