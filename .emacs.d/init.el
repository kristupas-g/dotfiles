(require 'use-package)

(use-package use-package
  :custom (

use-package-always-ensure t))

(require 'package)
(add-to-list 'package-archives
            '("melpa" . "https://melpa.org/packages/") t)

(setq package-native-compile t)
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
(setq gc-cons-threshold most-positive-fixnum)
(setq load-prefer-newer noninteractive)
(setq package-quickstart t)
(setq native-comp-async-report-warnings-errors nil)

(set-face-attribute 'default nil
                    :font "Iosevka Nerd Font Mono"
                    :height 160
                    :weight 'light)

(tool-bar-mode -1)
(tooltip-mode -1)
(menu-bar-mode -1)
(scroll-bar-mode -1)
(electric-pair-mode 1)
(setq ring-bell-function 'ignore)
(add-to-list 'default-frame-alist '(undecorated . t))

(add-to-list 'load-path (concat user-emacs-directory "elisp/"))

(when (eq system-type 'darwin)
  (require 'mac-os))

(require 'util)
(require 'user-interface)
(require 'editor)
(require 'keybinds)
(require 'completion)
(require 'org-config)
(require 'coding)
(require 'git)

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

(use-package projectile
  :config
  (keymap-set evil-normal-state-map "SPC p" 'projectile-command-map)
  (projectile-mode 1))

(use-package super-save
  :init
  (setq super-save-auto-save-when-idle t)
  (setq super-save-idle-duration 2)
  :config
  (super-save-mode 1))

(use-package vterm)

(use-package undo-tree)                
