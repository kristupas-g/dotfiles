export ZSH="$HOME/.oh-my-zsh"

ZSH_THEME="robbyrussell"
ENABLE_CORRECTION="true"
DISABLE_UNTRACKED_FILES_DIRTY="true"

plugins=(git)
source $ZSH/oh-my-zsh.sh

export EDITOR='code'

SESSION_NAME="tmux_session"
tmux has-session -t $SESSION_NAME 2>/dev/null
if [ $? != 0 ]; then
  tmux new-session -s $SESSION_NAME
else
  tmux attach-session -t $SESSION_NAME
fi