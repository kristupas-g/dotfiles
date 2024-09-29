export ZSH="$HOME/.oh-my-zsh"

ZSH_THEME="robbyrussell"
DISABLE_UNTRACKED_FILES_DIRTY="true"

plugins=(git)
source $ZSH/oh-my-zsh.sh

export EDITOR='nvim'

SESSION_NAME="tmux_session"
if [ -z "$TMUX" ]; then
  tmux has-session -t $SESSION_NAME 2>/dev/null
  if [ $? != 0 ]; then
    tmux new-session -s $SESSION_NAME
  else
    tmux attach-session -t $SESSION_NAME
  fi
fi

alias gs="git status -s"
alias c="clear"
alias lg="lazygit"
alias v="nvim"
