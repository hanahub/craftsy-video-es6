export default {
  formContent: (ctx) => {
    // if we're showing the "subscribe to join the conversation" cta, disable replying
    const hasCommentsCta = (document.querySelector('.TimeComments-commentsCta') != null)

    return hasCommentsCta ? '' : `
      <input type="hidden" name="parent" value="${ctx.data.id}" />
      <input type="hidden" name="target" value="${ctx.data.targetId}">
      <textarea name="body" required spellcheck="true" placeholder="Add a reply"></textarea>
      <div class="${ctx.settings.blockName}-form-actions">
        ${ctx._templates.SmallFileUploadInput('SmallFileUploadInput')}
        <button type="submit">Post</button>
      </div>
    `
  },
  timeCommentsLi: (ctx, comment) => {
    const elFrag = document.createDocumentFragment()
    let elComment = document.createElement('div')
    elComment.className = ctx.settings.itemBlockName
    elComment.setAttribute('data-commentid', comment.id)
    elComment.setAttribute('data-commenttime', comment.time)
    elComment.innerHTML = `
      <div class="${ctx.settings.itemBlockName}-main">
        ${ctx._templates.image(`${ctx.settings.itemBlockName}-authorImage`, comment.authorImage, comment.authorName)}
        <h4 class="${ctx.settings.itemBlockName}-authorName">${comment.authorName}</h4>
        <div class="${ctx.settings.itemBlockName}-commentOptions"></div>
        ${comment.commentImageUrl ? `<div class="${ctx.settings.itemBlockName}-image"><img src="${comment.commentImageUrl}" /></div>` : ''}
        <div class="${ctx.settings.itemBlockName}-body">${comment.body}</div>
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
