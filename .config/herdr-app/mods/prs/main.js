// prs: GitHub pull requests. Without props it's the sidebar list (list.js):
// your open PRs grouped by repo, each with a CI circle that opens its Jenkins
// build, then the foldable "To review" (the team's review requests, with a
// quick Approve) and "Merged" (your merges into main/master, the circle being
// the merge commit's CI) sections. With props { view: { repo, number } } it's
// one PR as a tab (view.js): the diff with review threads under their lines,
// the conversation, a comment box (PR, thread reply or diff line), Approve,
// and Merge / Close buttons that ask first. Both read GitHub through `gh`, so
// `gh auth login` must have been run.

import { View } from "gpui-kit";
import { props } from "herdr";
import { PullRequestList } from "./list.js";
import { PullRequestView } from "./view.js";

export default class PullRequests extends View {
  init(p, cx) {
    this.impl = props()?.view ? new PullRequestView() : new PullRequestList();
    this.impl.init(p, cx);
  }

  render(cx) {
    return this.impl.render(cx);
  }
}
