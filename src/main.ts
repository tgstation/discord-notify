import * as core from '@actions/core'
import * as github from '@actions/github'
import fetch from 'node-fetch'

type Embed = {
    title?: string
    description: string
    color?: number
    author?: AuthorEmbed
    image?: ImageEmbed
    url?: string
}

type AuthorEmbed = {
    name: string
    icon_url: string
}

type ImageEmbed = {
    url: string
}

type Body = {
    avatar_url?: string
    username?: string
    embeds: Embed[]
    flags: number
}

async function run(): Promise<void> {
    try {
        const webhookUrl = core.getInput('webhook_url', {required: true})
        const title = core.getInput('title')
        const message = core.getInput('message')
        const avatar_url = core.getInput('avatar_url')
        const username = core.getInput('username')
        const colour = core.getInput('colour')
        const show_author = core.getBooleanInput('show_author')
        const include_image = core.getBooleanInput('include_image')
        const custom_image_url = core.getInput('custom_image_url')
        const title_url = core.getInput('title_url')

        const embed: Embed = {
            title: title,
            description: message
        }

        const action = github.context.payload.action
        if (title === 'GET_ACTION' || message === 'GET_ACTION') {
            let user = 'Unknown'
            let type = 'Unknown'
            if (github.context.payload.pull_request) {
                user = github.context.payload.pull_request.user.login
                type = 'Pull Request'
                if (github.context.payload.pull_request.merged) {
                    user = github.context.payload.pull_request.merged_by.login
                }
            } else if (github.context.payload.issue) {
                user = github.context.payload.issue.user.login
                type = 'Issue'
            }
            if (action == 'closed' || action == 'reopened') {
                user = github.context.actor
            }

            let payload = `**${type} #${github.context.issue.number}`
            switch (action) {
                case 'opened':
                    payload += ' Opened by'
                    break
                case 'closed':
                    if (github.context.payload.pull_request?.merged) {
                        payload += ' Merged by'
                    } else {
                        payload += ' Closed by'
                    }

                    break
                case 'reopened':
                    payload += ' Reopened by'
            }
            payload += ` ${user}**`
            if (title == 'GET_ACTION') {
                embed.title = payload
            }
            if (message === 'GET_ACTION') {
                embed.description = payload
            }
        }

        if (colour !== '') {
            embed.color = parseInt(colour.replace('#', ''), 16)
        } else if (action === 'opened' || action === 'reopened') {
            embed.color = parseInt('#6cc644'.replace('#', ''), 16) // open or reopen. Github mantis color
        } else if (
            action === 'closed' &&
            github.context.payload.pull_request?.merged
        ) {
            embed.color = parseInt('#6e5494'.replace('#', ''), 16) // merged. github butterfly bush color
        } else {
            embed.color = parseInt('#bd2c00'.replace('#', ''), 16) // pr closed or error. github milano red color
        }

        if (show_author) {
            if (github.context.payload.pull_request) {
                embed.author = {
                    name: github.context.payload.pull_request.user.login,
                    icon_url:
                        github.context.payload.pull_request.user.avatar_url
                }
            } else if (github.context.payload.issue) {
                embed.author = {
                    name: github.context.payload.issue.user.login,
                    icon_url: github.context.payload.issue.user.avatar_url
                }
            }
        }

        embed.url = title_url
        if (embed.url.length === 0) {
            if (github.context.payload.pull_request) {
                embed.url = github.context.payload.pull_request.html_url
            } else if (github.context.payload.issue) {
                embed.url = github.context.payload.issue.html_url
            }
        }

        if (include_image) {
            embed.image = {
                url: `https://opengraph.githubassets.com/${github.context.sha}/${github.context.repo.owner}/${github.context.repo.repo}/pull/${github.context.issue.number}`
            }
            if (custom_image_url !== '') {
                embed.image = {
                    url: custom_image_url
                }
            }
        }

        const body: Body = {
            embeds: [embed],
            flags: 0 // flags: 4 (SUPPRESS_EMBEDS)
        }

        if (avatar_url !== '') {
            body.avatar_url = avatar_url
        }

        if (username !== '') {
            body.username = username
        }
        const payload = JSON.stringify(body)

        core.debug(payload)

        const webhookUrls: string[] = webhookUrl
            .split(',')
            .map((url: string) => url.trim())
        for (const url of webhookUrls) {
            await fetch(url, {
                method: 'POST',
                body: payload,
                headers: {'Content-Type': 'application/json'}
            })
        }
    } catch (error) {
        if (error instanceof Error) core.setFailed(error.message)
    }
}

run()
