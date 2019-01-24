/* global FormData, fetch, sessionStorage, File */
/* eslint-disable no-inner-declarations, no-unused-vars */
import { TimeObjectCollection } from './TimeObjectCollection.js'
import { eventDelegate } from '../../utils/eventDelegate.js'
import { SmallFileUploadInputDelegated } from '../form/input/SmallFileUploadInputDelegated.js'
import { ArrayClosestFinder } from '../../utils/ArrayClosestFinder.js'
import FormDataAndJSONConversion from '../../utils/FormDataAndJSONConversion.js'
import isAjaxLoading from '../../utils/isAjaxLoading.js'
import MediaQueries from '../../utils/MediaQueries.js'
import $ from 'jquery'

const mq = new MediaQueries().mq

const DEFAULTS = {
  blockName: 'TimeComments',
  dataSelMoreComments: 'data-request-moretimecomments',
  sort: 'DESC', // When injecting new comments... This decides if they should be injected above or below other comments at the same second
  selJSContents: null // Optional selector for element in which to append js generated views
}

const STORAGE_COMMENT = 'loggedOutComment'

const TEMPLATES = { // INSTANCE MUST SUPPLY TEMPLATES
  formContent: () => {},
  timeCommentsLi: () => {},
  image: (blockName, imgObj, alt) => {
    return `${imgObj ? `<img class="Image ${blockName} lazyload" alt="${alt}"
          data-src="${imgObj.src}"
          ${imgObj.srcset ? `data-srcset="${imgObj.srcset}"` : ''}
          ${imgObj.width ? `width="${imgObj.width}"` : ''}
          ${imgObj.height ? `height="${imgObj.height}"` : ''} />` : ''}`
  },
  SmallFileUploadInput: (blockName) => {
    return `<div class="${blockName}">
      <span class="${blockName}-name"></span>
      <input class="${blockName}-input" type="file" name="image" accept="image/png,image/gif,image/jpeg" />
      <label class="${blockName}-label" for="image">Include a Photo</label>
    </div>`
  }
}

export class TimeCommentsViewAbstract {
  constructor (el, config, settings) {
    if (!settings._templates) {
      throw new Error('Templates are required in settings')
    } else {
      this._templates = Object.assign({}, TEMPLATES, settings._templates)
    }

    this.settings = Object.assign({}, DEFAULTS, settings)
    this.el = el
    this.elJSContents = this.settings.selJSContents ? this.el.querySelector(this.settings.selJSContents) : this.el
    this.el.TimeCommentsAPI = this
    this.data = config
    this.comments = new TimeObjectCollection([], {
      remapRule: false
    })
    this.SmallFileUploadInputDelegated = new SmallFileUploadInputDelegated(el, {
      selBlockName: '.SmallFileUploadInput'}
    )
    this.init()
  }

  evClick (e) {
    eventDelegate.call(this, e, `[${this.settings.dataSelMoreComments}]`, this.moreCommentsClickEv.bind(this))
  }

  evChange (e) {}
  evSubmit (e) {
    eventDelegate.call(this, e, 'form', this.evFormSubmit.bind(this))
  }
  evReset (e) {}
  evFocusin (e) {}

  onSubmitSuccess (json) {
    if (!(json instanceof Array)) {
      json = [json]
    }
    this.addComment(json)
  }

  addComment (data) {
    const formattedComment = TimeCommentsViewAbstract.formatComments(data)
    this.comments.add(formattedComment)
  }

  init () {
    this.genElForm()
    this.setBinds()

    let sessData = sessionStorage.getItem(STORAGE_COMMENT)
    if (sessData && !this.data.authenticationUrl) {
      FormDataAndJSONConversion(JSON.parse(sessData)).then((formState) => {
        const formData = formState.formData
        this.fetch(formState.actionUrl, {
          credentials: 'include',
          method: 'POST',
          body: formData
        }).then((json) => {
          this.onSubmitSuccess(json)
          sessionStorage.removeItem(STORAGE_COMMENT)
        })
      })
    }
  }

  setBinds () {
    this.el.addEventListener('focusin', this)
    this.el.addEventListener('click', this)
    this.el.addEventListener('submit', this)
    this.el.addEventListener('change', this)
    this.el.addEventListener('reset', this)

    this.comments.on('TimeObjectCollection_Add', (data) => {
      this.updateComments(data.added)
    })
  }

  handleEvent (e) {
    switch (e.type) {
      case 'focusin':
        this.evFocusin(e)
        break
      case 'click':
        this.evClick(e)
        break
      case 'change':
        this.evChange(e)
        break
      case 'submit':
        this.evSubmit(e)
        break
      case 'reset':
        this.evReset(e)
        break
    }
  }

  /**
   * Scrolls window so the specified comment element is in view
   * @param {DOM Node} elComment
   */
  scrollToComment (elComment) {
    const isCommentsTabActive = ($('#activity').attr('data-anchorlist-content') === 'active')

    if (isCommentsTabActive && !this.autoScrollDisabled) {
      let y = $(elComment).offset().top

      if (!mq['mq-sm'].matches) {
        y -= $(elComment).height()
      }
      window.scroll({ top: y, left: 0, behavior: 'smooth' })
    }
  }

  /**
   * Smoothly scroll to the top of the page
   */
  scrollToTop () {
    window.scroll({ top: 0, left: 0, behavior: 'smooth' })
  }

  /**
    * @param {Event} handles all child form submissions
   */
  evFormSubmit (e) {
    e.preventDefault()
    e.stopPropagation()

    const elForm = e.target
    const actionUrl = elForm.getAttribute('action') || window.location.href
    const formData = new FormData(elForm)

    formData.forEach((value, key) => { // delete empty files... iOS for one breaks requests with empty files
      if (value instanceof File && !value.size) {
        formData.delete(key)
      }
    })

    if (this.player) {
      formData.append('playertimestamp', this.player.currentTime)
    }

    const authenticationUrl = this.data.authenticationUrl
    if (!authenticationUrl) {
      isAjaxLoading(this.elForm)
      this.fetch(actionUrl, {
        credentials: 'include',
        method: 'POST',
        body: formData
      }).then((json) => {
        this.onSubmitSuccess(json)
        this.elForm.reset()
        isAjaxLoading(this.elForm, false)
      }).catch(() => {
        isAjaxLoading(this.elForm, false, true)
      })
    } else {
      FormDataAndJSONConversion({
        actionUrl: actionUrl,
        formData: formData
      }).then((sessData) => {
        sessionStorage.setItem(STORAGE_COMMENT, JSON.stringify(sessData))
        setTimeout(() => {
          window.location = authenticationUrl
        }, 100)
      }).catch(function (err) {
        console.error(err)
      })
    }
  }

  getTimeMatches (time) {
    return [...this.elItemList.querySelectorAll(`[data-commenttime='${time}']`)]
  }

  updateComments (comment) {
    const elFrag = document.createDocumentFragment()
    const elLi = this._templates.timeCommentsLi(this, comment)
    elFrag.appendChild(elLi)
    const timeFloor = Math.floor(comment.playerTimestamp)
    let elsForTime = this.getTimeMatches(timeFloor)

    function firstCommentForTime (time) {
      let closestBiggerTime = this.comments.getClosestBigger(time)
      let elsForTime = this.getTimeMatches(closestBiggerTime)
      if (elsForTime.length) {
        elsForTime[0].parentNode.insertBefore(elFrag, elsForTime[0])
      } else {
        this.elItemList.appendChild(elFrag)
      }
    }

    if (this.settings.sort.toUpperCase() === 'ASC') {
      if (elsForTime.length && elsForTime[elsForTime.length - 1].nextSibling) {
        const elLastMatch = elsForTime[elsForTime.length - 1]
        elLastMatch.nextSibling.parentNode.insertBefore(elFrag, elLastMatch.nextSibling)
      } else {
        firstCommentForTime.call(this, comment.playerTimestamp)
      }
    } else { // DESC
      if (elsForTime.length) {
        const Finder = new ArrayClosestFinder(this.comments.data.get(timeFloor).reduce((arr, comment) => {
          if (comment.publishDateMs) {
            arr.push(comment.publishDateMs)
          }
          return arr
        }, []))
        const closestSmallerPublished = Finder.getClosestSmaller(comment.publishDateMs)
        if (closestSmallerPublished >= 0) {
          const elClosest = this.elItemList.querySelector(`[data-publishedtimestamp='${closestSmallerPublished}']`)
          elClosest.parentNode.insertBefore(elFrag, elClosest)
        } else {
          if (elsForTime[elsForTime.length - 1].nextSibling) {
            const elLastMatch = elsForTime[elsForTime.length - 1]
            elLastMatch.nextSibling.parentNode.insertBefore(elFrag, elLastMatch.nextSibling)
          } else {
            this.elItemList.appendChild(elFrag)
          }
        }
      } else {
        firstCommentForTime.call(this, comment.playerTimestamp)
      }
    }
  }

  moreCommentsClickEv (e) {
    e.preventDefault()
    e.stopPropagation()

    let elTarget = e.delegateTarget
    const actionUrl = elTarget.getAttribute(this.settings.dataSelMoreComments)
    elTarget.parentNode.removeChild(elTarget)
    this.fetch(actionUrl, {
      credentials: 'include'
    }).then((json) => {
      this.onSubmitSuccess(json)
    })
  }

  genElForm () {
    this.elForm = document.createElement('form')
    this.elForm.action = this.data.formActionUrl
    this.elForm.classList.add(`${this.settings.blockName}-form`)
    this.elForm.innerHTML = this._templates.formContent(this)
    this.elJSContents.appendChild(this.elForm)
  }

  get elItemList () {
    if (!this._elItemList) {
      this._elItemList = document.createElement('div')
      this._elItemList.classList.add(`${this.settings.blockName}-items`)
      this.elJSContents.appendChild(this._elItemList)
    }

    return this._elItemList
  }

  fetch (actionUrl, options) {
    let responseCopy
    return fetch(actionUrl, options).then(function (response) {
      responseCopy = response.clone()
      return response.json()
    }).catch(function (err) {
      if (err instanceof SyntaxError) {
        return responseCopy.text()
        .then(function (text) {
          window.console.error(text)
          throw err
        })
      } else {
        throw err
      }
    })
  }

  static formatComments (arr) {
    arr.forEach((item) => {
      item.published = item.timestamp
      item.time = Math.floor(item.playerTimestamp) // Match BE
      delete item.timestamp
    })
    return arr
  }
}
