if [[ -r "${XDG_CACHE_HOME:-$HOME/.cache}/p10k-instant-prompt-${(%):-%n}.zsh" ]]; then
  source "${XDG_CACHE_HOME:-$HOME/.cache}/p10k-instant-prompt-${(%):-%n}.zsh"
fi

if [ "$TMUX" = "" ]; then tmux; fi


export ZSH="/Users/kristupasgaidys/.oh-my-zsh"

ZSH_THEME="powerlevel10k/powerlevel10k"

CASE_SENSITIVE="false"

HYPHEN_INSENSITIVE="true"

plugins=(git 
    zsh-autosuggestions
    zsh-syntax-highlighting
    cd-ls
    zsh-tab-title
    zsh-vi-mode
)

source $ZSH/oh-my-zsh.sh

ZVM_VI_INSERT_ESCAPE_BINDKEY=jk

export EDITOR=/opt/homebrew/bin/nvim

alias c="clear"
alias h="cd /Users/kristupasgaidys/ && clear"
alias ls="exa --grid --colour always --icons"
alias zshconfig="vim ~/.zshrc"
alias repo="cd Documents/repos/"
alias vs="code ."
alias rm="rm -rf"
alias mkfile="touch"
alias glog="git log --oneline --decorate"
alias open="open ."
alias mysql="mycli -u root -p kristupas"
alias kill="fkill"
alias bi="brew install"
alias v="nvim"
alias vimconfig="cd ~/.config/nvim/"
alias tmuxconfig="cf ~/.tmux.conf"
alias benmeawsauth="aws codeartifact login --tool dotnet --domain benme --repository benme"

alias dbupdate="dotnet ef database update --project Benme.WebApi"
alias migrm="dotnet ef migrations remove --project Benme.Infrastructure --startup-project Benme.WebApi"

alias benmerun="dotnet run --project Benme.WebApi"

alias benmef="h && cd Documents/repos/work/benme-frontend"
alias benmeb="h && cd Documents/repos/work/benme-benefits-platform"


[[ ! -f ~/.p10k.zsh ]] || source ~/.p10k.zsh

export PATH="$PATH:$HOME/.spicetify"
path+=~/.local/bin
path+=~/.emacs.d/bin
