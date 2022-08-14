fish_add_path /opt/homebrew/bin
fish_add_path $HOME/.config/scripts/

if not set -q TMUX
    tmux attach-session
end

set fish_greeting

alias c="clear"
alias h="cd ~ && clear"
alias mysql="mycli -u root -p kristupas"
alias kill="fkill"
alias v="nvim"
alias vi="nvim ."
alias theme="kitty +kitten themes --reload-in=all"

alias benmeawsauth="aws codeartifact login --tool dotnet --domain benme --repository benme"
alias dbupdate="dotnet ef database update --project Benme.WebApi"
alias migrm="dotnet ef migrations remove --project Benme.Infrastructure --startup-project Benme.WebApi"
alias benmerun="dotnet run --project Benme.WebApi"

bind \cf 'cder'
bind \ce 'cder_nvim'
bind \cv 'nvim .'
