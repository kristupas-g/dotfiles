fish_add_path /opt/homebrew/bin
fish_add_path $HOME/.config/scripts/
fish_add_path $HOME/.cargo/bin/
fish_add_path $HOME/.dotnet/tools/

set -Ux JAVA_HOME /Library/Java/JavaVirtualMachines/jdk-19.jdk/Contents/Home
set -Ux EDITOR nvim

if not set -q TMUX
   tmux attach-session
end

# if not set -q ZELLIJ
#   zellij_sessionizer
# end

set fish_greeting

alias c="clear"
alias h="cd ~ && clear"
alias mysql="mycli -u root -p kristupas"
alias kill="fkill"
alias v="nvim"
alias vi="nvim ."
alias theme="kitty +kitten themes --reload-in=all"
alias py="python3"
alias pip="pip3"
alias tmuxa="tmux attach-session"

alias lg="lazygit"

bind \cf 'cder'
bind \ce 'cder_nvim'
bind \cv 'nvim .'
bind \cc 'clear'
bind \cp 'find_in_dir'


status --is-interactive; and rbenv init - fish | source
