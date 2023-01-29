(setq gc-cons-threshold 120000000)
(setq read-process-output-max (* 1024 1024))

(setq comp-async-report-warnings-errors nil) ;; Mute the native comp warnings

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
(setq vc-follow-symlinks t)

(setq mac-option-key-is-meta nil
      mac-command-key-is-meta t
      mac-command-modifier 'meta
      mac-option-modifier 'none)

(global-set-key (kbd "<escape>") 'keyboard-escape-quit)
(add-to-list 'default-frame-alist '(undecorated . t))
(add-to-list 'initial-frame-alist '(fullscreen . maximized))
(add-to-list 'default-frame-alist '(fullscreen . maximized))

(set-fringe-mode 30)

(set-face-attribute 'default nil :font "Iosevka Nerd Font Mono" :height 170 :weight 'extra-light)
(set-face-attribute 'fixed-pitch nil :font "JetBrainsMono Nerd Font Mono" :height 170)
(set-face-attribute 'variable-pitch nil :font "Liga SFMono Nerd Font" :height 170)

(use-package catppuccin-theme
  :init
  (setq catppuccin-flavor 'macchiato)
  :config
  (load-theme 'catppuccin t))

(use-package vertico
  :init
  (vertico-mode 1))

(use-package orderless
  :custom
  (completion-styles '(orderless basic))
  (completion-category-overrides '((file (styles basic partial-completion)))))

(use-package consult
  :bind
  ("C-x b" . consult-buffer)                
  ("C-x 4 b" . consult-buffer-other-window) 
  ("C-x 5 b" . consult-buffer-other-frame)  
  ("C-x r b" . consult-bookmark)            
  ("C-x p b" . consult-project-buffer)      
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

(use-package smartparens 
  :config (smartparens-global-mode))

(use-package doom-modeline
  :config (doom-modeline-mode 1)
  :init
  (setq doom-modeline-height 15)
  (setq doom-modeline-major-mode-icon nil)
  (setq doom-modeline-buffer-encoding nil))

(use-package all-the-icons
 :if (display-graphic-p))

(use-package rainbow-delimiters
  :hook prog-mode)

(use-package avy
  :bind ("C-." . avy-goto-word-1))

(use-package which-key
  :init (which-key-mode 1)
  :config
  (setq which-key-idle-delay 0.3))

(use-package highlight-indent-guides
  :hook prog-mode
  :init (setq highlight-indent-guides-method 'character))

;;TODO change this to corfu
(use-package company
  :hook prog-mode
  :custom
  (company-minimum-prefix-length 1)
  (company-idle-delay 0.0))

(use-package company-box
  :after company
  :hook company-mode)

(use-package helpful
  :bind
  ("C-h p" . helpful-at-point)
  ("C-h c" . helpful-command)
  ("C-h C" . helpful-callable)
  ("C-h f" . helpful-function)
  ("C-h k" . helpful-key)
  ("C-h v" . helpful-variable)
  ("C-h r" . helpful-visit-reference))

(use-package popper
  :config
  (setq popper-reference-buffers
	'("\\*Messages\\*"
	  "Output\\*$"
	  "\\*Async Shell Command\\*"
	  help-mode
	  compilation-mode))
  :bind (("C-/"   . popper-toggle-latest)
         ("M-/" . popper-toggle-type))
  :init
  (popper-mode 1)
  (popper-echo-mode 1)) 

(use-package exec-path-from-shell
  :config
  (when (memq window-system '(mac ns x))
  (exec-path-from-shell-initialize)))

(use-package magit
  :commands magit-status
  :custom
  (magit-display-buffer-function #'magit-display-buffer-same-window-except-diff-v1))

(use-package treesit-auto
  :config
  (setq treesit-auto-install 'prompt)
  :init
  (global-treesit-auto-mode))
(put 'upcase-region 'disabled nil)
