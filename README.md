# Instagram feed action  
Add a list of your latest Instagram pictures to your README page with automated content refresh!

![preview](images/example.png)
[Check it on the Readme Profile!](https://github.com/Alqueraf/Alqueraf#%EF%B8%8F-what-ive-been-up-to)

### How to use
- Go to your repository
- Add the following section to your **README.md** file, you can give whatever title you want. Just make sure that you use `<!-- INSTAGRAM-FEED:START --><!-- INSTAGRAM-FEED:END -->` in your readme. The workflow will replace this comment with the actual blog post list: 
```markdown
# Instagram feed
<!-- INSTAGRAM-FEED:START -->
<!-- INSTAGRAM-FEED:END -->
```
- Create a folder named `.github` and create a `workflows` folder inside it if it doesn't exist.
- Create a new file named `instagram-feed-workflow.yml` with the following contents inside the workflows folder:
```yaml
name: Latest instagram feed workflow
on:
  schedule: # Run workflow automatically
    - cron: '0 * * * *' # Runs every hour, on the hour
  workflow_dispatch: # Run workflow manually (without waiting for the cron to be called), through the Github Actions Workflow page directly
jobs:
  update-readme-with-instagram:
    name: Update this repo's README with latest instagram feed
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: alqueraf/instagram-feed-action@master
        with:
          account: "alqueraf"
```
- Replace the above instagram account with your own account.
- Commit and wait for it to run automatically or you can also trigger it manually from the Actions tab to see the result instantly.

### Options
This workflow has additional options that you can use to customize it for your use case. The following are the list of options available:

| Option | Default Value | Description | Required |
|--------|--------|--------|--------|
| `account` | `""` | The name of the instagram account to use, eg: `alqueraf` | Yes  |
| `max_post_count` | `6` | Maximum number of posts you want to show on your readme | No  |
| `image_size` | `250` | Image dimension in pixels for each post | No  |
| `image_margin` | `10` | Margin between post images | No  |
| `readme_path` | `./README.md` | Path of the readme file you want to update | No |
| `gh_token` | Your GitHub token with repo scope | Use this to configure the token of the user that commits the workflow result to GitHub | No |
| `commit_message` | `Updated with the latest instagram posts` | Allows you to customize the commit message | No |
| `committer_username` | `instagram-feed-bot` | Allows you to customize the committer username | No |
| `committer_email` | `instagram-feed-bot@example.com` | Allows you to customize the committer email | No |
<!-- 
### Contributing
Please see [CONTRIBUTING.md](CONTRIBUTING.md) for getting started with the contribution. Make sure that you follow [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md) while contributing and engaging in the discussions. **When contributing, please first discuss the change you wish to make via an issue on this repository before making the actual change**. -->

### Bugs
If you are experiencing any bugs, don’t forget to open a [new issue](https://github.com/alqueraf/instagram-feed-action/issues/new).

<!-- ### Thanks
- Thanks to all the **2K+✨** users of this workflow
- Thanks to all the [contributors](https://github.com/gautamkrishnar/blog-post-workflow/graphs/contributors)
- Thanks to [@codeSTACKr](https://github.com/codeSTACKr) for [this](https://www.youtube.com/watch?v=ECuqb5Tv9qI) amazing video -->

### Liked it?
Hope you liked this project, don't forget to give it a star ⭐