# GitHub Copilot Code Review Setup Guide

## Prerequisites

- GitHub Copilot Pro or Pro+ plan
- Repository admin access

## Step 1: Enable Custom Instructions

1. Navigate to repository **Settings**
2. Under **Code & automation**, click **Copilot**
3. Click **Code review**
4. Toggle **"Use custom instructions when reviewing pull requests"** → ON

## Step 2: Configure Automatic Review (Ruleset)

1. Navigate to **Settings** → **Rules** → **Rulesets**
2. Click **New ruleset** → **New branch ruleset**
3. Name: `copilot-auto-review`
4. Enforcement status: **Active**
5. Target branches: **Default branch** (master)
6. Under branch rules, enable:
   - Automatically request Copilot code review
   - Review new pushes (recommended)
   - Review draft pull requests (optional)
7. Click **Create**

## Step 3: Verify Setup

1. Create a test PR with a small change
2. Check that Copilot is automatically added as a reviewer
3. Verify review comments reference the custom instructions

## Notes

- Copilot leaves "Comment" reviews, not "Approve" — does not block merging
- Custom instructions are ~1000 lines max recommended
- Path-specific instructions use `applyTo` frontmatter with glob patterns

## References

- [Using Copilot Code Review - GitHub Docs](https://docs.github.com/copilot/using-github-copilot/code-review/using-copilot-code-review)
- [Configuring Automatic Code Review - GitHub Docs](https://docs.github.com/en/copilot/how-tos/use-copilot-agents/request-a-code-review/configure-automatic-review)
- [Custom Instructions Tutorial - GitHub Docs](https://docs.github.com/en/copilot/tutorials/use-custom-instructions)
- [Adding Repository Custom Instructions - GitHub Docs](https://docs.github.com/copilot/customizing-copilot/adding-custom-instructions-for-github-copilot)
- [awesome-copilot code-review-generic template](https://github.com/github/awesome-copilot/blob/main/instructions/code-review-generic.instructions.md)
