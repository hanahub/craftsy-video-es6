import { TimeCommentsViewAbstract } from './TimeCommentsViewAbstract.js'
import Templates from './TimeCommentReplies-Templates.js'
import Logger from 'logger'

const DEFAULTS = {
  blockName: 'TimeCommentReplies',
  itemBlockName: 'TimeCommentReply',
  selJSContents: `.TimeCommentReplies-contents`,
  sort: 'ASC'
}

const CONFIG_SCHEMA = {
  comments: [],
  paginationNextUrl: null
}

export class TimeCommentReplies extends TimeCommentsViewAbstract {
  constructor (el, data, settings) {
    settings = Object.assign({}, DEFAULTS, settings, {
      _templates: Templates
    })
    super(el, data, settings)
    this.el = el
  }

  init () {
    super.init()
    if (this.data.commentRepliesFragmentUri) {
      this.fetch(this.data.commentRepliesFragmentUri, {
        credentials: 'include'
      }).then((json) => {
        this.onSubmitSuccess(json)
      })
    }
  }

  onSubmitSuccess (data) {
    if (data.comments) { // unformatted data
      data = TimeCommentReplies.formatConfigData(data)
      super.onSubmitSuccess(data.comments)
    } else {
      super.onSubmitSuccess(data)
    }
  }

  show () {
    this.el.classList.add('show')
  }

  hide () {
    this.el.classList.remove('show')
  }

  toggle () {
    this.el.classList.toggle('show')
  }

  get elItemList () {
    if (!this._elItemList) {
      this._elItemList = document.createElement('div')
      this._elItemList.classList.add(`${this.settings.blockName}-items`)
      this.elJSContents.insertBefore(this._elItemList, this.elForm)
    }

    return this._elItemList
  }

  static formatConfigData (config) {
    if (typeof config === 'string') {
      try {
        config = JSON.parse(config)
      } catch (e) {
        Logger.info(e)
        config = {}
      }
    }

    config = Object.assign({}, CONFIG_SCHEMA, config)
    const comments = config.comments
    if (comments.length && config.paginationNextUrl) {
      comments[comments.length - 1].paginationNextUrl = config.paginationNextUrl
    }
    return config
  }
}
