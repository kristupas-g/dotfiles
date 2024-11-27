;;; completion.el --- Completion configuration
;;; Code:

(use-package vertico
  :init (vertico-mode 1))

(use-package orderless
  :custom (completion-styles '(orderless basic))
  (completion-category-overrides '((file (styles basic partial-completion)))))

(use-package consult)

(use-package marginalia
  :config (marginalia-mode 1))

(provide 'completion)

;;; completion.el ends here
