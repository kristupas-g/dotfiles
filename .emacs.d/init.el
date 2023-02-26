(require 'use-package)

(use-package use-package
  :custom (use-package-always-ensure t))

(use-package package
  :config
  (add-to-list 'package-archives
             '("melpa" . "https://melpa.org/packages/") t)
  (setq package-native-compile t))

(global-hl-line-mode)
(global-auto-revert-mode 1)
(save-place-mode 1)
(blink-cursor-mode -1)
(setq custom-file (concat user-emacs-directory "/custom.el"))
(load custom-file 'noerror 'nomessage)
(setq initial-major-mode 'fundamental-mode)
(set-default-coding-systems 'utf-8-unix)
(setq confirm-kill-processes nil)
(setq use-short-answers t)
(setq scroll-margin 9)
(setq-default line-spacing 6)
(setq make-backup-filnes nil)
(setq auto-save-default nil)
(setq inhibit-startup-message t)
(setq vc-follow-symlinks t)
(setq tab-always-indent 'complete)
(setq-default indent-tabs-mode nil)
(setq comp-async-report-warnings-errors nil)
(setq mac-option-key-is-meta nil mac-command-key-is-meta t mac-command-modifier 'meta mac-option-modifier 'none)
(setq gc-cons-threshold most-positive-fixnum)
(setq load-prefer-newer noninteractive)
(setq package-quickstart t)
(set-fringe-mode 0)
(setq native-comp-async-report-warnings-errors nil)

(set-face-attribute 'default nil
                    :font "Iosevka Nerd Font Mono"
                    :height 180
                    :weight 'extra-light)
(tool-bar-mode -1)
(tooltip-mode -1)
(menu-bar-mode -1)
(scroll-bar-mode -1)
(electric-pair-mode 1)
(setq ring-bell-function 'ignore)
(add-to-list 'default-frame-alist '(undecorated . t))
;; (add-to-list 'initial-frame-alist '(fpullscreen . maximized))
;; (add-to-list 'default-frame-alist '(fullscreen . maximized))
;; (set-frame-parameter (selected-frame) 'alpha '(95 . 50))
;; (add-to-list 'default-frame-alist '(alpha . (95 . 50)))
(keymap-global-set "C-x C-u" 'nil)
(keymap-global-set "M-p" 'previous-buffer)
(keymap-global-set "M-n" 'next-buffer)
(keymap-global-set "C-c C-b" 'nil)
(keymap-global-set "C-c C-f" 'nil)

(keymap-global-set "M-w" 'nil)
(keymap-global-set "M-w o" 'other-window)
(keymap-global-set "M-w f" 'delete-other-windows)
(keymap-global-set "M-w v" 'split-window-right)
(keymap-global-set "M-w b" 'split-window-below)
(keymap-global-set "M-w d" 'delete-window)
(keymap-global-set "M-w B" 'balance-windows)

(keymap-global-set "M-c" 'copy-region-as-kill)
(keymap-global-set "M-v" 'yank)
(keymap-global-set "C-M-c" 'kill-region)

(defun kg/kill-word ()
  "Kill word under or in front of the cursor"
    (er/mark-word)
    (delete-region (mark) (point)))

(defun kg/kill-in-pairs ()
  "Kill content in pair of brackets"
  (er/mark-inside-pairs)
  (delete-region (mark) (point)))

(keymap-global-set "M-k" 'nil)
(keymap-global-set "M-k s" 'kill-sentence)
(keymap-global-set "M-k w" 'kg/kill-word)
(keymap-global-set "M-k b" 'kg/kill-in-pairs)

(use-package catppuccin-theme
  :disabled t
  :config (setq catppuccin-flavor 'macchiato)
  :init (load-theme 'catppuccin t))

(use-package timu-spacegrey-theme
  :disabled t
  :config
  (load-theme 'timu-spacegrey t))

(use-package doom-themes
  :config
  (load-theme 'doom-ir-black t))

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

(use-package helpful
  :bind ("C-h p" . helpful-at-point)
  ("C-h c" . helpful-command)
  ("C-h C" . helpful-callable)
  ("C-h f" . helpful-function)
  ("C-h k" . helpful-key)
  ("C-h v" . helpful-variable)
  ("C-h r" . helpful-visit-reference))

(use-package expand-region
  :bind ("C-'" . 'er/expand-region))

(use-package popper
  :config
  (setq popper-reference-buffers
        '("\\*Messages\\*" "\\*Warnings\\*" "\\*Helpfuln" "Output\\*$" "\\*Async Shell Command\\*" "\\*Backtrace\\*" help-mode compilation-mode))
  :bind (("C-/" . popper-toggle-latest)
         ("M-/" . popper-toggle-type))
  :init (popper-mode 1)
  (popper-echo-mode 1))

(use-package vertico
  :init (vertico-mode 1))

(use-package orderless
  :custom (completion-styles '(orderless basic))
  (completion-category-overrides '((file (styles basic partial-completion)))))

(use-package consult
  :bind ("C-x b" . consult-buffer)
  ("C-x 4 b" . consult-buffer-other-window)
  ("C-x 5 b" . consult-buffer-other-frame)
  ("C-x r b" . consult-bookmark)
  ("C-x p
  b" . consult-project-buffer)
  ("M-y" . consult-yank-pop)
  ("M-g e" . consult-compile-error)
  ("M-g f" . consult-flycheck)
  ("M-g g" . consult-goto-line)
  ("M-g M-g" . consult-goto-line)
  ("M-g o" . consult-outline)
  ("M-g m" . consult-mark)
  ("M-g k" . consult-global-mark)
  ("M-g i" . consult-imenu)
  ("M-g I" . consult-imenu-multi)
  ("M-s g" . consult-grep)
  ("M-s e" . consult-isearch-history))

(use-package marginalia
  :config (marginalia-mode 1))

(use-package corfu
  :custom
  (corfu-cycle t)
  (corfu-auto t)
  ;; (corfu-quit-no-match t)
  ;; (corfu-preview-current t)
  ;; (corfu-scroll-margin 6)
  ;; (corfu-echo-mode t)
  ;; (corfu-auto-delay t)
  ;; (corfu-echo-delay t)
  :init (global-corfu-mode))

(use-package exec-path-from-shell
  :config (when (memq window-system '(mac ns x))
            (exec-path-from-shell-initialize)))

(use-package magit
  :commands magit-status
  :custom (magit-display-buffer-function #'magit-display-buffer-same-window-except-diff-v1))

(use-package treesit-auto
  :config (setq treesit-auto-install 'prompt)
  :init (global-treesit-auto-mode))

(use-package eglot
  :hook ((python-ts-mode . eglot-ensure)
         (csharp-ts-mode . eglot-ensure)
         (json-ts-mode . eglot-ensure)
         (rust-ts-mode . eglot-ensure)
         (go-ts-mode . eglot-ensure)
         (bash-ts-mode . eglot-ensure))
  :bind (:map eglot-mode-map
              ("C-c e n" . flymake-goto-next-error)
              ("C-c e p" . flymake-goto-prev-error)
              ("C-c e P" . flymake-show-project-diagnostics)
              ("C-c e b" . flymake-show-buffer-diagnostics)
              ("C-c a" . eglot-code-actions)
              ("C-c h" . eldoc-doc-buffer)
              ("C-c r" . eglot-rename)
              ("C-c d" . xref-find-definitions)
              ("C-c g" . eglot-find-implementation)
              ("C-c t" . eglot-find-typeDefinition)))

(use-package avy
  :bind ("C-;" . 'avy-goto-char))

(use-package ace-window
  :config
  (keymap-global-set "M-o" 'ace-window))

(use-package super-save
  :config
  (super-save-mode 1))

(use-package org-roam
  :custom
  (org-roam-directory "~/Org")
  (org-roam-complete-everywhere t)
  :init
  (org-roam-db-autosync-mode))

(use-package org
  :init
  (org-indent-mode)
  (variable-pitch-mode 1)
  (auto-fill-mode 0)
  :config
  (setq org-ellipsis " ▾"
        org-hide-emphasis-markers t))

(use-package org-bullets
  :after org
  :hook (org-mode . org-bullets-mode))

(font-lock-add-keywords 'org-mode
                        '(("^ *\\([-]\\) "
                          (0 (prog1 () (compose-region (match-beginning 1) (match-end 1) "•"))))))

(dolist (face '((org-level-1 . 1.2)
                (org-level-2 . 1.1)
                (org-level-3 . 1.05)
                (org-level-4 . 1.0)
                (org-level-5 . 1.1)
                (org-level-6 . 1.1)
                (org-level-7 . 1.1)
                (org-level-8 . 1.1))))

(require 'org-indent)

(set-face-attribute 'org-block nil :foreground nil :inherit 'fixed-pitch)
(set-face-attribute 'org-code nil   :inherit '(shadow fixed-pitch))
(set-face-attribute 'org-indent nil :inherit '(org-hide fixed-pitch))
(set-face-attribute 'org-verbatim nil :inherit '(shadow fixed-pitch))
(set-face-attribute 'org-special-keyword nil :inherit '(font-lock-comment-face fixed-pitch))
(set-face-attribute 'org-meta-line nil :inherit '(font-lock-comment-face fixed-pitch))
(set-face-attribute 'org-checkbox nil :inherit 'fixed-pitch)






