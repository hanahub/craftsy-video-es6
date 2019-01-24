/* global dataLayer */
import { eventDelegate } from '../../utils/eventDelegate.js'

const DEFAULTS = {
  materialsBlockName: '.AnchorList a[href="#materials"]',
  materialsLinkBlockName: '.VideoPage-materialLinks-item a.FileLink',
  commentsBlockName: '.AnchorList a[href="#activity"]',
  postCommentBlockName: '.TimeComments-commentsControls button[type="submit"]',
  externalLinkBlockName: '.TagListAlt-items a.Link',
  bookmarkTagName: 'input[name="bookmarktag"]:checked',
  bookmarkDeleteName: 'data-update-action-value="delete"',
  commentTypeName: '.VideoPage-comments .TimeComments-form input[name="commenttype"]:checked',
  commentFileUploadName: '.VideoPage-comments .TimeComments-form .SmallFileUploadInput-name',
  discussionReplyName: '.TimeCommentReplies-contents [type="submit"]',
  discussionLikeName: '.ActionBarTimeComment .LikeButton',
  episodeName: '',
  episodeId: -1,
  playlistId: -1
}

export class VideoPageAnalyticsDelegated {
  constructor (el, settings) {
    this.settings = Object.assign({}, DEFAULTS, settings)
    this.el = el
    this.setBinds()
  }

  // this takes these variables and sets them local in case they are updated via ajax
  fireNewRouteLogging (name, episodeId, playlistId) {
    this.settings.episodeName = name
    this.settings.episodeId = episodeId
    this.settings.playlistId = playlistId

    dataLayer.push({
      'event': 'video interaction',
      'contentCard': {
        'eventType': 'episode change',
        'name': this.settings.episodeName, // name of ep
        'episodeId': this.settings.episodeId, // episode id
        'playlistId': this.settings.playlistId // id of associated playlist for saved content
      }
    })
  }

  materialTabClick (e) {
    dataLayer.push({
      'event': 'video interaction',
      'contentCard': {
        'eventType': 'material tab',
        'name': this.settings.episodeName, // name of ep
        'episodeId': this.settings.episodeId, // episode id
        'playlistId': this.settings.playlistId // id of associated playlist for saved content
      }
    })
  }

  materialsLinkClick (e) {
    // we can't pass these in but they should exist as data attributes and text on the node
    let materialLabel = e.target.innerText
    let materialId = e.target.getAttribute('data-material-id')

    dataLayer.push({
      'event': 'video interaction',
      'contentCard': {
        'eventType': 'download material',
        'name': materialLabel, // name of the material = event_label in GTM
        'materialId': materialId, // id of the material being downloaded
        'playlistId': this.settings.playlistId // id of associated playlist
      }
    })
  }

  commentsTabClick (e) {
    dataLayer.push({
      'event': 'video interaction',
      'contentCard': {
        'eventType': 'activity tab',
        'name': this.settings.episodeName, // name of ep
        'episodeId': this.settings.episodeId, // episode id
        'playlistId': this.settings.playlistId // id of associated playlist for saved content
      }
    })
  }

  postCommentClick (e) {
    const elComment = this.el.querySelector(this.settings.commentFileUploadName)
    const elCommentType = this.el.querySelector(this.settings.commentTypeName)
    const commentType = (elCommentType && elCommentType.value) || ''
    let contentStyle = 'text_only'

    if (elComment && elComment.innerText) {
      contentStyle = 'text_and_image'
    }

    dataLayer.push({
      'event': 'video interaction',
      'contentCard': {
        'eventType': 'discussion add',
        'commentType': commentType, // this input will have 4 possible inputs ('comment' (all discussion add will be this category unless specified), 'question', 'project', 'review')
        'commentStyle': contentStyle, // this input will have 3 options ('text_only', 'image', 'text_and_image')
        'playlistId': this.settings.playlistId
      }
    })
  }

  externalLinkClick (e) {
    // since this fires only when you click tags on about tab, so 'linkType' is hard coded for now - we can implement other options in the future
    dataLayer.push({
      'event': 'video interaction',
      'contentCard': {
        'eventType': 'link click',
        'linkType': 'tag_page_link', // there will be only 3 option for this input, ('tag_page_link', 'video_reco_link', 'article_link')
        'playlistId': this.settings.playlistId // id of associated playlist for saved content
      }
    })
  }

  addBookmarkClick (e) {
    const tags = e.target.querySelectorAll(this.settings.bookmarkTagName)
    let bookmarkTag = []
    tags.forEach(v => bookmarkTag.push(v.value))

    dataLayer.push({
      'event': 'video interaction',
      'contentCard': {
        'eventType': 'bookmark add',
        'bookmarkTag': bookmarkTag.join('') ? bookmarkTag.join('') : null, // null if user did not tag, string of the tag label
        'bookmarkNote': e.detail.bookmark.title, // Boolean of whether a Bookmark had a note (true/false), we do not track what the Note is
        'episodeId': this.settings.episodeId, // episode id
        'playlistId': this.settings.playlistId // id of associated playlist for saved content
      }
    })
  }

  deleteBookmarkClick (e) {
    dataLayer.push({
      'event': 'video interaction',
      'contentCard': {
        'eventType': 'bookmark delete',
        'bookmarkNote': '', // Boolean of whether a Bookmark had a note (true/false), we do not track what the Note is
        'episodeId': this.settings.episodeId, // episode id
        'playlistId': this.settings.playlistId // id of associated playlist for saved content
      }
    })
  }

  discussionReplyClick (e) {
    const elComment = e.target.closest('.TimeCommentReplies-form').querySelector('.SmallFileUploadInput-name')
    let contentStyle = 'text_only'
    if (elComment && elComment.innerText) {
      contentStyle = 'text_and_image'
    }

    dataLayer.push({
      'event': 'video interaction',
      'contentCard': {
        'eventType': 'discussion reply',
        'commentStyle': contentStyle, // this input will have 3 options ('text_only', 'image', 'text_and_image')
        'playlistId': this.settings.playlistId // id of associated playlist
      }
    })
  }

  discussionLikeClick (e) {
    dataLayer.push({
      'event': 'Clap',
      'contentCard': {
        'eventType': 'clap add',
        'contentType': 'Comment', // 3 possible options --> 'Bookmark', 'Playlist', "Comment"
        'playlistId': this.settings.playlistId // id of associated playlist for saved content
      }
    })
  }

  setBinds () {
    this.el.addEventListener('click', this)
  }

  handleEvent (e) {
    switch (e.type) {
      case 'click':
        eventDelegate.call(this, e, `${this.settings.materialsBlockName}`, this.materialTabClick.bind(this))
        eventDelegate.call(this, e, `${this.settings.materialsLinkBlockName}`, this.materialsLinkClick.bind(this))
        eventDelegate.call(this, e, `${this.settings.commentsBlockName}`, this.commentsTabClick.bind(this))
        eventDelegate.call(this, e, `${this.settings.postCommentBlockName}`, this.postCommentClick.bind(this))
        eventDelegate.call(this, e, `${this.settings.externalLinkBlockName}`, this.externalLinkClick.bind(this))
        eventDelegate.call(this, e, `${this.settings.discussionReplyName}`, this.discussionReplyClick.bind(this))
        eventDelegate.call(this, e, `${this.settings.discussionLikeName}`, this.discussionLikeClick.bind(this))

        break
    }
  }
}
