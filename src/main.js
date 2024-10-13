const core = require('@actions/core')
const { wait } = require('./wait')
const github = require('@actions/github')

/**
 * The main function for the action.
 * @returns {Promise<void>} Resolves when the action is complete.
 */
async function run() {
  try {
    //
    const owner = core.getInput('owner', { required: true })
    const repo = core.getInput('repo', { required: true })
    const pr_no = core.getInput('pr_no', { required: true })
    const token = core.getInput('token', { required: true })

    //init octokit
    const octokit = github.getOctokit(token)

    const { data: changedFiles } = await octokit.rest.pulls.listFiles({
      owner,
      repo,
      pull_number: pr_no
    })

    let diffData = {
      addition: 0,
      deletion: 0,
      changes: 0
    }

    diffData = changedFiles.reduce((acc, file) => {
      acc.additions += file.additions
      acc.deletions += file.deletions
      acc.changes += file.changes
      return acc
    }, diffData)

    //Create comments
    await octokit.rest.issues.createComment({
      owner,
      repo,
      pr_no,
      body: `
        PR #${pr_no} update with \n
        - ${diffData.changes} changes \n
        - ${diffData.addition} additions \n
      `
    })

    //Add Label
    for (const file of changedFiles) {
      const fileExtension = file.filename.split('.').pop()

      let label = ''
      switch (fileExtension) {
        case 'md':
          label = 'Markdown'
          break
        case 'js':
          label = 'JavaScript'
          break
        case 'yml':
          label = 'Yaml'
          break
        default:
          label = 'no extension'
      }
      // set Labels
      await octokit.rest.issues.addLabels({
        owner,
        repo,
        pr_no,
        labels: [label]
      })
    }
  } catch (error) {
    // Fail the workflow run if an error occurs
    core.setFailed(error.message)
  }
}

module.exports = {
  run
}
