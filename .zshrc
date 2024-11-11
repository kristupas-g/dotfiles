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

function repair() {
  id=`blueutil --paired | grep "Magic" | grep -Eo '[a-z0-9]{2}(-[a-z0-9]{2}){5}'`
  name=`blueutil --paired | grep "Magic" | grep -Eo 'name: "\S+"'`
  echo "unpairing with BT device $id, $name"
  blueutil --unpair "$id"
  echo "unpaired, waiting a few seconds for kb to go to pairable state"
  sleep 3
  echo "pairing with BT device $id, $name"
  blueutil --pair "$id" "0000"
  echo "paired"
  blueutil --connect "$id"
  echo "connected"
}

export PATH="$HOME/.rbenv/bin:$PATH"

alias gs="git status -s"
alias c="clear"
alias lg="lazygit"
alias v="nvim"
alias py="python3"
alias rebuild="darwin-rebuild switch --flake ~/dotfiles/nix#kristupas_mac"
