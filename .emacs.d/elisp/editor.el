;;; editor.el --- Text editing configuration

;;; Commentary:
;; Evil configuration

;;; Code:

(use-package evil
  :init
  (setq evil-want-keybinding nil
        evil-want-integration t
        evil-want-C-u-scroll t)
  :config (evil-mode 1))

(use-package evil-escape
  :after evil
  :init
  (setq-default evil-escape-key-sequence "jk"
                evil-escape-delay 0.15)
  :config
  (advice-add 'evil-escape-func :after #'save-buffer)
  (evil-escape-mode))

(use-package evil-surround
  :after evil
  :config
  (global-evil-surround-mode 1))

(evil-global-set-key 'normal (kbd "gcc") 'comment-line)

(use-package evil-collection
  :after evil
  :init (evil-collection-init))

(provide 'editor)

;;; editor.el ends here
