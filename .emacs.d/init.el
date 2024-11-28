(require 'use-package)

(use-package use-packagault-coding-systems 'utf-8-unix)
(setq confirm-kill-processes nil)
(setq use-short-answers t)
(setq scroll-margin 30)
(setq make-backup-filnes nil)
(setq auto-save-default nil)
(setq inhibit-startup-message t)
(setq vc-follow-symlinks t)
(setq tab-always-indent 'complete)
(setq-default indent-tabs-mode nil)
(setq comp-async-report-warnings-errors nil)
(setq gc-cons-threshold most-positive-fixnum)
(setq load-prefer-newer noninteractive)
(setq package-quickstart t)
(setq native-comp-async-report-warnings-errors nil)

(add-hook 'prog-mode-hook #'display-line-numbers-mode)

(set-face-attribute 'default nil
                    :font "Iosevka Nerd Font Mono"
                    :height 190
                    :weight 'light)

(tool-bar-mode -1)
(tooltip-mode -1)
(menu-bar-mode -1)
(scroll-bar-mode -1)
(electric-pair-mode 1)
(blink-cursor-mode -1)
(setq ring-bell-function 'ignore)
(add-to-list 'default-frame-alist '(undecorated . t))

(auto-save-visited-mode 1)
(setq auto-save-visited-interval 1)

(add-to-list 'load-path (concat user-emacs-directory "elisp/"))

(when (eq system-type 'darwin)
  (require 'mac-os))

(setq project-switch-commands #'project-find-file)

(require 'util)
(require 'user-interface)
(require 'editor)
(require 'keybinds)
(require 'completion)
;; (require 'org-config)
(require 'coding)
(require 'git)
(require 'ruby)

(use-package helpful
  :general
  (general-define-key
   :keymaps 'help-map
    "c" #'helpful-callable
    "f" #'helpful-function
    "M" #'helpful-macro
    "C" #'helpful-command
    "k" #'helpful-key
    "v" #'helpful-variable
    "p" #'helpful-at-point))

(use-package popper
  :init
  (setq popper-reference-buffers
        '("\\*Messages\\*"
          "\\*Warnings\\*"
          "\\*Help\\*"
          "\\*Helpful"
          "Output\\*$"
          "\\*Async Shell Command\\*"
          "\\*Backtrace\\*"
          "\\*Apropos\\*"
          help-mode
          compilation-mode))
  :config
  (popper-mode 1)
  (popper-echo-mode 1)
  :general
  (leader
    "." 'popper-toggle-latest
    ">" 'popper-toggle-type
    "," 'popper-cycle))

(custom-set-variables
 ;; custom-set-variables was added by Custom.
 ;; If you edit it by hand, you could mess it up, so be careful.
 ;; Your init file should contain only one such instance.
 ;; If there is more than one, they won't work right.
 '(package-selected-packages
   '(all-the-icons consult corfu doom-modeline doom-themes
                   evil-collection evil-escape evil-nerd-commenter
                   evil-snipe evil-surround exec-path-from-shell
                   flycheck general helpful magit marginalia orderless
                   org-roam org-superstar popper projectile
                   rainbow-delimiters super-save treesit-auto
                   undo-tree vertico vterm)))
(custom-set-faces
 ;; custom-set-faces was added by Custom.
 ;; If you edit it by hand, you could mess it up, so be careful.
 ;; Your init file should contain only one such instance.
 ;; If there is more than one, they won't work right.
 )
