/* global MutationObserver */
/* eslint no-useless-escape: 0 */
/* eslint no-inner-declarations: 0 */
/* eslint-disable no-undef */
import { TimeCommentsViewAbstract } from './TimeCommentsViewAbstract.js'
import { TimeCommentReplies } from './TimeCommentReplies.js'
import { eventDelegate } from '../../utils/eventDelegate.js'
import Templates from './TimeComments-Templates.js'
import MediaQueries from '../../utils/MediaQueries.js'
import Logger from 'logger'
import $ from 'jquery'

const mq = new MediaQueries().mq

const DEFAULTS = {
  blockName: 'TimeComments',
  itemBlockName: 'TimeComment',
  repliesBlockName: 'TimeCommentReplies',
  dataSelReplyTrigger: 'data-communityreply-trigger',
  selReplyCount: '.TimeCommentReplies-count',
  selSubmitButton: '.TimeComments-commentsControls [type="submit"]',
  selScrollControl: 'input[name="scrolling"]'
}

const CONFIG_SCHEMA = {
  bucketsize: 10, // optional: default bucketsize
  commenting: {},
  formActionUrl: null,
  targetId: null,
  paginationNextUrl: null,
  commentsCtaUrl: null
}

const REGEX_PAGINATION_BUCKET_URL = /(bucket=)[^\&]+/

export class TimeComments extends TimeCommentsViewAbstract {
  constructor (el, config, settings) {
    settings = Object.assign({}, DEFAULTS, settings, {
      _templates: Templates
    })
    super(el, config, settings)
    this.VideoPagePseudoPopup = this.settings.VideoPagePseudoPopup
    this.player = this.settings.player
    this.bucketsize = config.bucketsize
    this.paginationNextUrl = config.paginationNextUrl
    this.itemListObserver = new MutationObserver(this.observerResond.bind(this))
    this.itemListObserver.observe(this.elItemList, {
      attributes: false,
      childList: true,
      subtree: false
    })
  }

  observerResond (mutations) {
    mutations.forEach((mutation) => {
      if (mutation.type === 'childList' && mutation.addedNodes.length) {
        this.scrollToComment(mutation.addedNodes[0])
      }
    })
  }

  setBinds () {
    super.setBinds()

    mq['mq-only-xxs'].addListener((e) => {
      if (!e.matches) {
        this.VideoPagePseudoPopup.close()
      }
    })
  }

  init () {
    super.init()

    /* if (this.elAutoScroll) {
      this.autoScrollDisabled = !this.elAutoScroll
    } */
    this.autoScrollDisabled = true

    if (this.data.comments && this.data.comments.length) {
      this.addComment(this.data.comments)
    }

    if (mq['mq-only-xxs'].matches || mq['mq-only-xs'].matches) {
      this.initScrollUpControlsFeature()
    }
  }

  scrollToComment (elComment) {
    // temporarily disabling auto-scrolling to new comments at non-fixed video player breakpoints (so, md and above)
    if (mq['mq-md'].matches) {
      return
    }
    super.scrollToComment(elComment)
  }

  /**
   * While scrolling down the page, the comment controls and tabs get scrolled off the screen.
   * But as soon as the user scrolls back up, they should immediately appear again.
   */
  initScrollUpControlsFeature () {
    let scrollPos = $(window).scrollTop()
    let scrollDirection = 'idle'
    let scrollDirTimer = null
    const commentsSelector = '.VideoPage-comments'
    const formSelector = '.TimeComments-form'
    const tabsSelector = '.VideoPage-main .AnchorList:first'
    const formOffsetY = $(tabsSelector).height() + $('.VideoPage-media').height() + $('.CraftsyHeader-contentWrapper').height()
    const tabsOffsetY = Math.floor($('.VideoPage-media').height(), 10) + $('.CraftsyHeader-contentWrapper').height()

    $(tabsSelector + ' a').on('click', (e) => {
      if (!$(e.target).closest('.AnchorList').hasClass('fixed')) {
        return true
      }

      $(formSelector).removeClass('fixed').css('top', 'auto')
      $(tabsSelector).removeClass('fixed').css('top', 'auto')
      $(commentsSelector).find('.ScrollPlaceholder').remove()

      this.scrollToTop()
    })

    $(window).scroll(function () {
      if ($('#activity').attr('data-anchorlist-content') !== 'active') {
        return
      }

      let scroll = $(window).scrollTop()

      if (scroll > (scrollPos + 1) && scrollDirection !== 'down') { // Checking against `scrollPos + 1` to avoid weird 1-off bug where controls are hidden inadvertently
        clearTimeout(scrollDirTimer)

        scrollDirection = 'down'
        $(formSelector).removeClass('fixed').css('top', 'auto')
        $(tabsSelector).removeClass('fixed').css('top', 'auto')
        $(commentsSelector).find('.ScrollPlaceholder').remove()
      } else if (scroll < (scrollPos - 1) && scrollDirection !== 'up' && scroll >= 115) { // Checking against `scrollPos - 1` to avoid weird 1-off bug where controls are shown inadvertently
        clearTimeout(scrollDirTimer)

        scrollDirTimer = setTimeout(() => {
          scrollDirection = 'up'
          $(formSelector).addClass('fixed').css('top', formOffsetY + 'px')
          $(tabsSelector).addClass('fixed').css('top', tabsOffsetY + 'px')
          if ($(commentsSelector).find('.ScrollPlaceholder').length < 1) {
            $('.TimeComments-items').before($('<div class="ScrollPlaceholder"></div>'))
          }
        }, 200)
      }

      scrollPos = scroll
    })
  }

  scrollControlChangeEv (e) {
    const target = e.delegateTarget
    this.autoScrollDisabled = !target.checked
  }

  evChange (e) {
    super.evChange(e)
    eventDelegate.call(this, e, `${this.settings.selScrollControl}`, this.scrollControlChangeEv.bind(this))
  }

  evClick (e) {
    super.evClick(e)
    eventDelegate.call(this, e, `[${this.settings.dataSelReplyTrigger}], ${this.settings.selReplyCount}`, this.repliesClickEv.bind(this))
    eventDelegate.call(this, e, `${this.settings.selSubmitButton}`, this.submitButtonClick.bind(this))
  }

  evFocusin (e) {
    super.evFocusin(e)
    eventDelegate.call(this, e, 'input, textarea', this.evInputFocused.bind(this))
  }

  evSubmit (e) {
    super.evSubmit(e)
    this.VideoPagePseudoPopup.close()
  }

  evReset (e) {
    super.evReset(e)
    eventDelegate.call(this, e, 'form', this.formResetEv.bind(this))
  }

  updateComments (comment) {
    super.updateComments(comment)
    this.markBestMatchingCommentForTimelineTime(this.time)
  }

  /**
   * Runs when form is reset... restore scroll checkbox setting
   */
  formResetEv (e) {
    if (this.elAutoScroll) {
      setTimeout(() => {
        this.elAutoScroll.checked = !this.autoScrollDisabled
      }, 25)
    }
  }

  /**
   * Form submits are using submit event... Using click event here to intercept and avoid submit event in mobile
   * Logic runs only if its mobile, and if popup is not open... If popup is open form behaves normally
   * @param {Event} e is the Event such that we can prevent default
   */
  submitButtonClick (e) {
    if (mq['mq-only-xxs'].matches && !this.VideoPagePseudoPopup.isOpen(this.elForm)) {
      e.preventDefault() // disallow submit event
      e.stopPropagation()
      this.player.pause()
      this.VideoPagePseudoPopup.open(this.elForm)
    }
  }

  onSubmitSuccess (data) {
    if (data.commenting) { // full unformatted data
      // 'load more' button clicked
      data = TimeComments.formatConfigData(data)
      super.onSubmitSuccess(data.comments)

      // we've temporarily disabled auto-scrolling at non-fixed video player breakpoints in `this.scrollToComment`
      // but still need to scroll comments after 'load more' is clicked
      if (mq['mq-md'].matches) {
        let comment = data.comments.pop()
        if (comment) {
          super.scrollToComment($(`[data-commentid="${comment.id}"]`)[0])
        }
      }
    } else {
      // new comment submitted
      super.onSubmitSuccess(data)

      // we've temporarily disabled auto-scrolling at non-fixed video player breakpoints in `this.scrollToComment`
      // but we still need to scroll to new user's comment posts
      if (mq['mq-md'].matches) {
        super.scrollToComment($(`[data-commentid="${data.id}"]`)[0])
      }
    }
  }

  repliesClickEv (e) {
    e.preventDefault()
    e.stopPropagation()

    const elComment = e.target.closest('[data-commentid][data-commenttime]')

    if (elComment) {
      const commentTime = parseFloat(elComment.getAttribute('data-commenttime'))
      const commentId = elComment.getAttribute('data-commentid')
      const commentObj = this.comments.findObjByTimeAndKey(commentTime, 'id', commentId)
      if (!commentObj.TimeCommentsReplies) {
        commentObj.TimeCommentsReplies = new TimeCommentReplies(elComment.querySelector(`.${this.settings.repliesBlockName}`), Object.assign({}, commentObj, {
          targetId: this.data.targetId,
          formActionUrl: this.data.formActionUrl,
          authenticationUrl: this.data.authenticationUrl,
          parentId: commentObj.id
        }))
      }
      commentObj.TimeCommentsReplies.toggle()
    }
  }

  evInputFocused (e) {
    this.player.pause()
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

    const commenting = config.commenting
    let flatStructure = Object.keys(commenting).map((key) => {
      const cmKey = commenting[key]
      const cm = cmKey.comments
      if (cm.length) {
        cm[0].paginationNextUrl = cmKey.paginationNextUrl
      }
      return cm
    })
    flatStructure = [].concat(...flatStructure)

    delete config.commenting
    config.comments = flatStructure
    return config
  }

  /**
   * markBestMatchingCommentForTimelineTime adds a data-attribute to the comment best matching the current time in timeline
   * This data attribute allows easy showing|hiding of all comments before that time vs the comments after
   * css example .comment.Marked ~ .comment {}
   * @param {Int} time
   * @param {Bool} first returns the first item... Default is last match
   */
  markBestMatchingCommentForTimelineTime (time) {
    time = time || Math.floor(this.time)
    const itemBlockName = this.settings.itemBlockName
    const dataSelNewestTimeMatch = 'data-timecomments-newest-at-time'

    function getCommentElByTime (time, first) {
      const els = [...this.elItemList.querySelectorAll(`.${itemBlockName}[data-commenttime='${time}'], .${itemBlockName}[data-commenttime^='${time}.']`)]
      if (els.length) {
        return first ? els[0] : els[els.length - 1]
      } else {
        return null
      }
    }

    const elMarkedLiItemPrev = this.elItemList.querySelector(`[${dataSelNewestTimeMatch}]`)
    let elMarkedLiItem = getCommentElByTime.call(this, time)
    let closestTimeForEl = time

    if (!elMarkedLiItem) {
      closestTimeForEl = this.comments.getClosestSmaller(time)
      elMarkedLiItem = getCommentElByTime.call(this, closestTimeForEl)
    }

    if (elMarkedLiItem && elMarkedLiItem !== elMarkedLiItemPrev) { // display comments up to current video time
      if (elMarkedLiItemPrev) {
        elMarkedLiItemPrev.removeAttribute(dataSelNewestTimeMatch)
      }
      elMarkedLiItem.setAttribute(dataSelNewestTimeMatch, '')

      this.scrollToComment(getCommentElByTime.call(this, closestTimeForEl, true)) // scroll to first item matching time of elMarkedLiItem
    }
  }

  /**
   * grabBucketData fetches data for next and previous buckets... It caches requests on _bucketCache, as not to repeat them
   * @param {Int} time // Current time... in timeline
   */
  grabBucketData (time) {
    const bSize = this.bucketsize
    this._bucketCache = this._bucketCache || {}
    if (time > bSize / 2) {
      const modu = time % bSize
      const delta = bSize - modu
      const rightBucket = (time + delta) / bSize
      const currentBucket = rightBucket - 1

      function fetchBucket (url) {
        if (!(url in this._bucketCache)) {
          this.fetch(url, {
            credentials: 'include'
          }).then((json) => {
            this.onSubmitSuccess(json)
          })
          this._bucketCache[url] = url
        }
      }

      if (delta < 10) { // 2nd half of bucket
        fetchBucket.call(this, this.paginationNextUrl.replace(REGEX_PAGINATION_BUCKET_URL, '$1' + rightBucket))
      } else if (currentBucket) { // 1st half of bucket. No request for bucket 0
        fetchBucket.call(this, this.paginationNextUrl.replace(REGEX_PAGINATION_BUCKET_URL, '$1' + currentBucket))
      }
    }
  }

  // GETTERS
  get elAutoScroll () {
    return this.elForm.querySelector('[name="scrolling"]')
  }

  get time () {
    return this._time || 0
  }

  set time (val) {
    if (val !== this._time) {
      const timeFloor = Math.floor(val)
      const prevTimeFloor = Math.floor(this._time)

      if (timeFloor !== prevTimeFloor) {
        this.markBestMatchingCommentForTimelineTime(timeFloor)
        this.grabBucketData(timeFloor)
      }

      this._time = val
    }
    return this._time
  }
}
