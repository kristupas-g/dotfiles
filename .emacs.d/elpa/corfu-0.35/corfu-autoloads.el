;;; corfu-autoloads.el --- automatically extracted autoloads (do not edit)   -*- lexical-binding: t -*-
;; Generated by the `loaddefs-generate' function.

;; This file is part of GNU Emacs.

;;; Code:

(add-to-list 'load-path (or (and load-file-name (file-name-directory load-file-name)) (car load-path)))



;;; Generated autoloads from corfu.el

(autoload 'corfu-mode "corfu" "\
Completion Overlay Region FUnction.

This is a minor mode.  If called interactively, toggle the `Corfu
mode' mode.  If the prefix argument is positive, enable the mode,
and if it is zero or negative, disable the mode.

If called from Lisp, toggle the mode if ARG is `toggle'.  Enable
the mode if ARG is nil, omitted, or is a positive number.
Disable the mode if ARG is a negative number.

To check whether the minor mode is enabled in the current buffer,
evaluate `corfu-mode'.

The mode's hook is called both when the mode is enabled and when
it is disabled.

(fn &optional ARG)" t)
(put 'global-corfu-mode 'globalized-minor-mode t)
(defvar global-corfu-mode nil "\
Non-nil if Global Corfu mode is enabled.
See the `global-corfu-mode' command
for a description of this minor mode.
Setting this variable directly does not take effect;
either customize it (see the info node `Easy Customization')
or call the function `global-corfu-mode'.")
(custom-autoload 'global-corfu-mode "corfu" nil)
(autoload 'global-corfu-mode "corfu" "\
Toggle Corfu mode in all buffers.
With prefix ARG, enable Global Corfu mode if ARG is positive;
otherwise, disable it.

If called from Lisp, toggle the mode if ARG is `toggle'.
Enable the mode if ARG is nil, omitted, or is a positive number.
Disable the mode if ARG is a negative number.

Corfu mode is enabled in all buffers where `corfu--on' would do it.

See `corfu-mode' for more information on Corfu mode.

(fn &optional ARG)" t)
(register-definition-prefixes "corfu" '("corfu-"))


;;; Generated autoloads from corfu-echo.el

(defvar corfu-echo-mode nil "\
Non-nil if Corfu-Echo mode is enabled.
See the `corfu-echo-mode' command
for a description of this minor mode.")
(custom-autoload 'corfu-echo-mode "corfu-echo" nil)
(autoload 'corfu-echo-mode "corfu-echo" "\
Show candidate documentation in echo area.

This is a global minor mode.  If called interactively, toggle the
`Corfu-Echo mode' mode.  If the prefix argument is positive,
enable the mode, and if it is zero or negative, disable the mode.

If called from Lisp, toggle the mode if ARG is `toggle'.  Enable
the mode if ARG is nil, omitted, or is a positive number.
Disable the mode if ARG is a negative number.

To check whether the minor mode is enabled in the current buffer,
evaluate `(default-value \\='corfu-echo-mode)'.

The mode's hook is called both when the mode is enabled and when
it is disabled.

(fn &optional ARG)" t)
(register-definition-prefixes "corfu-echo" '("corfu-echo-"))


;;; Generated autoloads from corfu-history.el

(defvar corfu-history-mode nil "\
Non-nil if Corfu-History mode is enabled.
See the `corfu-history-mode' command
for a description of this minor mode.
Setting this variable directly does not take effect;
either customize it (see the info node `Easy Customization')
or call the function `corfu-history-mode'.")
(custom-autoload 'corfu-history-mode "corfu-history" nil)
(autoload 'corfu-history-mode "corfu-history" "\
Update Corfu history and sort completions by history.

This is a global minor mode.  If called interactively, toggle the
`Corfu-History mode' mode.  If the prefix argument is positive,
enable the mode, and if it is zero or negative, disable the mode.

If called from Lisp, toggle the mode if ARG is `toggle'.  Enable
the mode if ARG is nil, omitted, or is a positive number.
Disable the mode if ARG is a negative number.

To check whether the minor mode is enabled in the current buffer,
evaluate `(default-value \\='corfu-history-mode)'.

The mode's hook is called both when the mode is enabled and when
it is disabled.

(fn &optional ARG)" t)
(register-definition-prefixes "corfu-history" '("corfu-history"))


;;; Generated autoloads from corfu-indexed.el

(defvar corfu-indexed-mode nil "\
Non-nil if Corfu-Indexed mode is enabled.
See the `corfu-indexed-mode' command
for a description of this minor mode.")
(custom-autoload 'corfu-indexed-mode "corfu-indexed" nil)
(autoload 'corfu-indexed-mode "corfu-indexed" "\
Prefix candidates with indices.

This is a global minor mode.  If called interactively, toggle the
`Corfu-Indexed mode' mode.  If the prefix argument is positive,
enable the mode, and if it is zero or negative, disable the mode.

If called from Lisp, toggle the mode if ARG is `toggle'.  Enable
the mode if ARG is nil, omitted, or is a positive number.
Disable the mode if ARG is a negative number.

To check whether the minor mode is enabled in the current buffer,
evaluate `(default-value \\='corfu-indexed-mode)'.

The mode's hook is called both when the mode is enabled and when
it is disabled.

(fn &optional ARG)" t)
(register-definition-prefixes "corfu-indexed" '("corfu-indexed-"))


;;; Generated autoloads from corfu-info.el

(autoload 'corfu-info-documentation "corfu-info" "\
Show documentation of current candidate." t)
(autoload 'corfu-info-location "corfu-info" "\
Show location of current candidate." t)
(register-definition-prefixes "corfu-info" '("corfu-info--restore-on-next-command"))


;;; Generated autoloads from corfu-popupinfo.el

(defvar corfu-popupinfo-mode nil "\
Non-nil if Corfu-Popupinfo mode is enabled.
See the `corfu-popupinfo-mode' command
for a description of this minor mode.")
(custom-autoload 'corfu-popupinfo-mode "corfu-popupinfo" nil)
(autoload 'corfu-popupinfo-mode "corfu-popupinfo" "\
Corfu info popup minor mode.

This is a global minor mode.  If called interactively, toggle the
`Corfu-Popupinfo mode' mode.  If the prefix argument is positive,
enable the mode, and if it is zero or negative, disable the mode.

If called from Lisp, toggle the mode if ARG is `toggle'.  Enable
the mode if ARG is nil, omitted, or is a positive number.
Disable the mode if ARG is a negative number.

To check whether the minor mode is enabled in the current buffer,
evaluate `(default-value \\='corfu-popupinfo-mode)'.

The mode's hook is called both when the mode is enabled and when
it is disabled.

(fn &optional ARG)" t)
(register-definition-prefixes "corfu-popupinfo" '("corfu-popupinfo-"))


;;; Generated autoloads from corfu-quick.el

(autoload 'corfu-quick-jump "corfu-quick" "\
Jump to candidate using quick keys." t)
(autoload 'corfu-quick-insert "corfu-quick" "\
Insert candidate using quick keys." t)
(autoload 'corfu-quick-complete "corfu-quick" "\
Complete candidate using quick keys." t)
(register-definition-prefixes "corfu-quick" '("corfu-quick"))

;;; End of scraped data

(provide 'corfu-autoloads)

;; Local Variables:
;; version-control: never
;; no-byte-compile: t
;; no-update-autoloads: t
;; no-native-compile: t
;; coding: utf-8-emacs-unix
;; End:

;;; corfu-autoloads.el ends here
