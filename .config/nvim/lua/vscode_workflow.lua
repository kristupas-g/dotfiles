local vscode = require('vscode')
local api = vim.api

if not api.nvim_buf_set_option then
  api.nvim_buf_set_option = function(buf, name, value)
    api.nvim_set_option_value(name, value, { buf = buf })
  end
end
if not api.nvim_buf_get_option then
  api.nvim_buf_get_option = function(buf, name)
    return api.nvim_get_option_value(name, { buf = buf })
  end
end
if not api.nvim_win_set_option then
  api.nvim_win_set_option = function(win, name, value)
    api.nvim_set_option_value(name, value, { win = win })
  end
end
if not api.nvim_win_get_option then
  api.nvim_win_get_option = function(win, name)
    return api.nvim_get_option_value(name, { win = win })
  end
end

local M = {}

local active_folder_js = [[
  const active = vscode.window.activeTextEditor?.document.uri;
  const folders = vscode.workspace.workspaceFolders ?? [];
  const folder = active ? vscode.workspace.getWorkspaceFolder(active) : undefined;
  const scoped = folders.length > 1 && folder ? folder : undefined;
]]

function M.quick_open()
  vscode.eval_async(active_folder_js .. [[
    await vscode.commands.executeCommand('workbench.action.quickOpen', scoped ? scoped.name + '/' : '');
  ]])
end

function M.find_in_files(opts)
  opts = opts or {}
  vscode.eval_async(active_folder_js .. [[
    await vscode.commands.executeCommand('workbench.action.findInFiles', {
      query: '',
      filesToInclude: scoped ? './' + scoped.name : '',
      filesToExclude: args.exclude,
    });
  ]], { args = { exclude = opts.exclude or '' } })
end

function M.pick_repo()
  vscode.eval_async([[
    const folders = vscode.workspace.workspaceFolders ?? [];
    const picked = await vscode.window.showQuickPick(folders.map(f => f.name), { placeHolder: 'Repository' });
    if (!picked) return;
    await vscode.commands.executeCommand('workbench.action.quickOpen', picked + '/');
  ]])
end

function M.pick_repo_terminal()
  vscode.eval_async([[
    const folders = vscode.workspace.workspaceFolders ?? [];
    const picked = await vscode.window.showQuickPick(folders.map(f => f.name), { placeHolder: 'Terminal in repository' });
    const folder = folders.find(f => f.name === picked);
    if (!folder) return;
    const existing = vscode.window.terminals.find(t => t.name === folder.name);
    (existing ?? vscode.window.createTerminal({ name: folder.name, cwd: folder.uri })).show();
  ]])
end

function M.run_in_terminal(command)
  vscode.eval_async(active_folder_js .. [[
    const name = folder ? folder.name : 'nvim';
    const existing = vscode.window.terminals.find(t => t.name === name);
    const terminal = existing ?? vscode.window.createTerminal({ name, cwd: folder ? folder.uri : undefined });
    terminal.show(true);
    terminal.sendText(args.command);
  ]], { args = { command = command } })
end

function M.open_changes()
  vscode.eval_async([[
    const active = vscode.window.activeTextEditor?.document.uri;
    const git = vscode.extensions.getExtension('vscode.git')?.exports?.getAPI(1);
    const repo = git ? (active ? git.getRepository(active) : git.repositories[0]) : undefined;
    if (!repo) {
      vscode.window.showWarningMessage('No git repository for the active file');
      return;
    }
    const name = repo.rootUri.path.split('/').pop();
    await repo.status();
    const INDEX_ADDED = 1, INDEX_DELETED = 2, DELETED = 6, UNTRACKED = 7, INTENT_TO_ADD = 9;
    const seen = new Set();
    const resources = [];
    for (const change of [...repo.state.indexChanges, ...repo.state.workingTreeChanges, ...repo.state.untrackedChanges]) {
      const key = change.uri.toString();
      if (seen.has(key)) continue;
      seen.add(key);
      const isNew = [INDEX_ADDED, UNTRACKED, INTENT_TO_ADD].includes(change.status);
      const isDeleted = [INDEX_DELETED, DELETED].includes(change.status);
      resources.push({
        originalUri: isNew ? undefined : git.toGitUri(change.originalUri ?? change.uri, 'HEAD'),
        modifiedUri: isDeleted ? undefined : change.uri,
      });
    }
    if (resources.length === 0) {
      vscode.window.showInformationMessage(name + ': no changes against HEAD');
      return;
    }
    await vscode.commands.executeCommand('_workbench.openMultiDiffEditor', { title: name + ': changes', resources });
  ]])
end

function M.create_pr()
  vscode.eval_async(active_folder_js .. [[
    await vscode.commands.executeCommand('pr.create', folder ? { repoPath: folder.uri.fsPath } : undefined);
  ]])
end

function M.setup()
  local function map(lhs, rhs, mode, desc)
    vim.keymap.set(mode or 'n', lhs, rhs, { desc = desc })
  end
  local function action(command)
    return function()
      vscode.action(command)
    end
  end

  map('<leader>j', M.quick_open, nil, 'Quick open scoped to current repository')
  map('<leader>s', M.pick_repo, nil, 'Pick repository, then quick open in it')
  map('<leader>S', M.pick_repo_terminal, nil, 'Pick repository, open terminal in it')
  map('<leader>w', M.find_in_files, nil, 'Find in files scoped to current repository')
  map('<leader>m', M.open_changes, nil, 'Working tree diff of current repository')
  map('<leader>M', action('workbench.view.scm'), nil, 'workbench.view.scm')
  map('<leader>e', action('workbench.files.action.showActiveFileInExplorer'))
  map('<leader>p', action('workbench.action.openPreviousRecentlyUsedEditorInGroup'))
  map('<leader>qn', action('editor.action.marker.nextInFiles'))
  map('<leader>qp', action('editor.action.marker.prevInFiles'))
  map('<leader>qq', action('workbench.actions.view.problems'))
  map('<leader>f', action('editor.action.formatDocument'))
  map('<leader>f', action('editor.action.formatSelection'), 'x')
  map('<leader>rn', action('editor.action.rename'))
  map('<leader>.', action('editor.action.quickFix'), { 'n', 'x' })
  map('<leader>h', action('editor.action.showHover'))
  map('<leader>en', action('editor.action.marker.next'))
  map('<leader>ep', action('editor.action.marker.prev'))
  map('<leader>o', action('extension.goToSpec'))
  map('<leader>O', function()
    vscode.action('workbench.action.splitEditor', {
      callback = function()
        vscode.action('extension.goToSpec')
      end,
    })
  end, nil, 'extension.goToSpec in split')
  map('<leader>g', function()
    vscode.action('workbench.action.tasks.runTask', { args = { 'lazygit' } })
  end, nil, 'lazygit task')
  map('<leader>gp', M.create_pr, nil, 'Create pull request (GitHub Pull Requests)')
end

return M
