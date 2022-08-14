if [ "$TMUX" = "" ]; then "tmux attatch"; fi

export EDITOR=/opt/homebrew/bin/nvim

alias c="clear"
alias h="cd /Users/kristupasgaidys/ && clear"
alias repo="cd Documents/repos/"
alias mysql="mycli -u root -p kristupas"
alias kill="fkill"
alias v="nvim"
alias vic="cd ~/.config/nvim/"

alias benmeawsauth="aws codeartifact login --tool dotnet --domain benme --repository benme"
alias dbupdate="dotnet ef database update --project Benme.WebApi"
alias migrm="dotnet ef migrations remove --project Benme.Infrastructure --startup-project Benme.WebApi"
alias benmerun="dotnet run --project Benme.WebApi"
alias benmef="h && cd Documents/repos/work/benme-frontend"
alias benmeb="h && cd Documents/repos/work/benme-benefits-platform"


path+=~/.local/bin
