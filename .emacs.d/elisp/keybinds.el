;;; keybinds.el --- Emacs keybind configuration
;;; Code:

(use-package general
  :config
  (general-create-definer leader
                          :prefix "SPC"
                          :keymaps 'normal)
  (general-create-definer files
                          :prefix "SPC f"
                          :keymaps 'normal)
  (general-create-definer git
                          :prefix "SPC g"
                          :keymaps 'normal)
  (general-create-definer buffer
                          :prefix "SPC b"
                          :keymaps 'normal)
  (general-create-definer org
                          :prefix "SPC o"
                          :keymaps 'normal)
  (general-create-definer open
                          :prefix "SPC O"
                          :keymaps 'normal))

;; This doesnt work in some buffers
(keymap-set evil-normal-state-map "SPC w" 'evil-window-map)
(keymap-set evil-normal-state-map "SPC h" 'help-command)

(leader
  ":" 'execute-extended-command)

(buffer
  "p" #'previous-buffer
  "n" #'next-buffer
  "b" #'consult-buffer
  "e" #'eval-buffer
  "k" #'kill-current-buffer)

(open
  "d" #'dired
  "t" #'vterm
  "s" #'eshell)

(files
 "f"   #'find-file
 "d"   #'dired
 "s"   #'save-buffer
 "p"   #'goto-personal-config
 "n f" #'dired-create-empty-file
 "n d" #'dired-create-empty-directory)

(provide 'keybinds)

;;; keybinds.el ends here
