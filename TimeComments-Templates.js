export default {
  multiCheckboxControlItem: (item) => {
    const blockName = 'MultiCheckboxControlItem'
    return `<div class="${blockName}">
      <label class="${blockName}-label">
        <input type="radio" ${item.checked ? 'checked' : ''} name="${item.name}" value="${item.value}">
        <div class="${blockName}-description">
          <div class="${blockName}-description-label">${item.label}</div>
        </div>
      </label>
    </div>`
  },
  multiCheckboxControl: (ctx, items) => {
    const blockName = 'MultiCheckboxControl'
    return `
      <div class="${blockName}">
        <div class="${blockName}-title">
          blank
        </div>
        <div class="${blockName}-items">
          ${items.map(item => `<div class="${blockName}-items-item">${ctx._templates.multiCheckboxControlItem(item)}</div>`).join('')}
        </div>
      </div>
    `
  },
  formContent: (ctx) => {
    const commentTypes = (ctx.data.commentTypes || []).map((type, index) => {
      return {
        label: type,
        value: type,
        name: 'commenttype',
        checked: index === 0
      }
    })

    const commentsCta = (commentsCtaUrl) => {
      if (!commentsCtaUrl || !commentsCtaUrl.length) {
        return ''
      }
      return `<div class="${ctx.settings.blockName}-commentsCta">
        <a class="${ctx.settings.blockName}-commentsCta-link" href="${commentsCtaUrl}">Subscribe to Join the Conversation</a>
      </div>`
    }

    return `
      <h4>New Post</h4>
      ${ctx.data.avatarImageUrl ? `<img class="${ctx.settings.blockName}-avatar" src="${ctx.data.avatarImageUrl}" />` : ''}
      ${ctx._templates.multiCheckboxControl(ctx, commentTypes)}
      <input type="hidden" name="target" value="${ctx.data.targetId}" />
      ${ctx.data.parentId ? `<input type="hidden" name="parent" value="${ctx.data.id}" />` : ''}
      <textarea name="body" required spellcheck="true" placeholder="Join the conversation. Post a comment."></textarea>
      <div class="${ctx.settings.blockName}-form-actions">
        ${ctx._templates.SmallFileUploadInput('SmallFileUploadInput')}
        <button type="submit" data-videopage-popup-submit>Post</button>
        <button data-videopage-popup-cancel>Cancel</button>
      </div>
      <div class="${ctx.settings.blockName}-commentsControls">
        <h5>Comments</h5>
        <button type="submit"><div class="${ctx.settings.blockName}-postButtonTitle">Post</div></button>
        <label class="${ctx.settings.blockName}-scrollControl">
          <input type="checkbox" value="true" name="scrolling" checked />
          <span>Auto Scroll</span>
        </label>
      </div>
      ${commentsCta(ctx.data.commentsCtaUrl)}
    `
  },
  actionButton: (action) => {
    const blockName = `${action.type}Button`
    return `
      <a
        ${action.type ? `data-type='${action.type}' ` : ''}
        ${action.state ? `data-state='${action.state}' ` : ''}
        ${action.endpoint ? `data-url='${action.endpoint}' ` : ''}
        ${action.authenticationUrl ? `data-auth-url='${action.authenticationUrl}' ` : ''}
        ${action.target ? `data-target='${action.target}' ` : ''}
        class='${blockName}'>

        <div class='${blockName}-count'>${action.count}</div>
        <span class='${blockName}-label-text socialText'>${action.type}</span>
      </a>
    `
  },
  actionBarTimeComment: (ctx, comment) => {
    // if the "subscribe to join the conversation" cta is visible, disable replying
    if (ctx.data.commentsCtaUrl) {
      return ''
    }

    return (comment.actions && comment.actions[0].items) ? `
      <div class="ActionBarTimeComment">
        ${comment.actions[0].items.map(item => ctx._templates.actionButton(item)).join('')}
        <div class="${ctx.settings.itemBlockName}-community-reply" ${ctx.settings.dataSelReplyTrigger}></div>
      </div>
    ` : ''
  },
  timeCommentsLi: (ctx, comment) => {
    const elFrag = document.createDocumentFragment()
    let elComment = document.createElement('div')
    elComment.className = ctx.settings.itemBlockName
    elComment.setAttribute('data-commentid', comment.id)
    elComment.setAttribute('data-commenttime', comment.time)
    elComment.setAttribute('data-publishedtimestamp', comment.publishDateMs)
    elComment.innerHTML = `
      <div class="${ctx.settings.itemBlockName}-main">
        ${ctx._templates.image(`${ctx.settings.itemBlockName}-authorImage`, comment.authorImage, comment.authorName)}
        <h4 class="${ctx.settings.itemBlockName}-authorName">${comment.authorName}</h4>
        <time class="${ctx.settings.itemBlockName}-playerTimestamp">${comment.displayPlayerTimestamp}</time>
        <div class="${ctx.settings.itemBlockName}-commentOptions"></div>
        ${comment.commentImageUrl ? `<div class="${ctx.settings.itemBlockName}-image"><img src="${comment.commentImageUrl}" /></div>` : ''}
        <div class="${ctx.settings.itemBlockName}-body">${comment.body}</div>
      </div>
      <div class="${ctx.settings.itemBlockName}-community ${ctx.settings.repliesBlockName}" data-timecomment-replies="${comment.commentRepliesCount}"  data-ajax-url="${comment.commentRepliesFragmentUri}">
        <h6 class="${ctx.settings.repliesBlockName}-count">${comment.commentRepliesCount} ${comment.commentRepliesCount > 1 ? 'replies' : 'reply'}</h6>
        ${ctx._templates.actionBarTimeComment(ctx, comment)}
        <div class="${ctx.settings.repliesBlockName}-contents">
          <!--replies injected here-->
        </div>
      </div>
    `
    elFrag.appendChild(elComment)
    if (comment.paginationNextUrl) {
      const elNext = document.createElement('div')
      elNext.className = `${ctx.settings.blockName}-reqMoreTimeComments`
      elNext.setAttribute('data-request-moretimecomments', comment.paginationNextUrl)
      elNext.innerHTML = `<div class='${ctx.settings.blockName}-reqMoreTimeCommentsButton'>
        Load More Posts
      </div>`
      elFrag.appendChild(elNext)
    }
    return elFrag
  }
}
