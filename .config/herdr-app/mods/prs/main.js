// prs: your open GitHub pull requests. Without props it's the sidebar list
// (list.js): PRs grouped by repo, each with a CI circle that opens its Jenkins
// build. With props { view: { repo, number } } it's one PR as a tab (view.js):
// the diff with review threads under their lines, the conversation, and
// Merge / Close buttons that ask first. Both read GitHub through `gh`, so
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
