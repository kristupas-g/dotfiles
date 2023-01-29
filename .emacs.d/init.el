(setenv "LSP_USE_PLISTS" "true")
(setq gc-cons-threshold 120000000)
(setq read-process-output-max (* 1024 1024))

(setq comp-async-report-warnings-errors nil) ;; Mute the native comp warnings

(require 'package)
(add-to-list 'package-archives '("melpa" . "https://melpa.org/packages/"))
(add-to-list 'package-archives '("org" . "https://orgmode.org/elpa/"))

(eval-when-compile
  (require 'use-package))

(setq use-package-always-ensure t)
(setq use-package-expand-minimally t)
(setq package-native-compile t)

(tool-bar-mode -1)
(tooltip-mode -1)
(menu-bar-mode -1)
(scroll-bar-mode -1)
(blink-cursor-mode -1)
(setq-default mode-line-format nil)
(setq scroll-margin 7)
(setq line-spacing 6)
(setq make-backup-files nil)
(setq auto-save-default nil)
(setq inhibit-startup-message t)
(setq custom-file (concat user-emacs-directory "/custom.el"))

(setq mac-option-key-is-meta nil
      mac-command-key-is-meta t
      mac-command-modifier 'meta
      mac-option-modifier 'none)

(global-set-key (kbd "<escape>") 'keyboard-escape-quit)

(add-to-list 'default-frame-alist '(undecorated-round . t))
; Maximized
(add-to-list 'initial-frame-alist '(fullscreen . maximized))
(add-to-list 'default-frame-alist '(fullscreen . maximized))

;; Horizontal padding
(set-fringe-mode 30)

(set-face-attribute 'default nil :font "Iosevka Nerd Font Mono" :height 170 :weight 'extra-light)

;; Enable vertico
(use-package vertico
  :init
  (vertico-mode 1))

(use-package consult
  :init
  (consult-mode 1))

(use-package marginalia
  :init
  (marginalia-mode 1))

(use-package smartparens 
  :config
  (smartparens-global-mode))

(use-package doom-themes
  :config
  (load-theme 'doom-one t))

(use-package doom-modeline
  :init
  (setq doom-modeline-height 15)
  (setq doom-modeline-major-mode-icon nil)
  (setq doom-modeline-buffer-encoding nil)
  :config
  (doom-modeline-mode 1))

(use-package all-the-icons
 :if (display-graphic-p))

(use-package rainbow-delimiters
  :hook (prog-mode . rainbow-delimiters-mode))

(use-package which-key
  :init (which-key-mode 1)
  :config
  (setq which-key-idle-delay 0.3))

(use-package dashboard
  :init
  (setq dashboard-center-content t)
  :config
  (dashboard-setup-startup-hook))

(use-package highlight-indent-guides
  :init
  (setq highlight-indent-guides-method 'character)
  :hook
  (prog-mode . highlight-indent-guides-mode))

(use-package magit
  :commands magit-status
  :custom
  (magit-display-buffer-function #'magit-display-buffer-same-window-except-diff-v1))

(use-package flycheck
  :disabled t)

(use-package company
  :hook (elisp-mode . company-mode)
  :bind (:map company-active-map
	 ("<right>" . company-complete-selection))
	(:map lsp-mode-map
	 ("<right>" . company-indent-or-complete-common))
  :custom
  (company-minimum-prefix-length 1)
  (company-idle-delay 0.0))

(use-package company-box
  :after company
  :hook (company-mode . company-box-mode))

(use-package yasnippet
  :disabled t)

(use-package helpful
  :commands (helpful-variable helpful-function helpful-at-point))

(use-package projectile
  :config
  (projectile-mode 1))

(use-package org
  :disabled t
  :config
  (doom-themes-org-config))

