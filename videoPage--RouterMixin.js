/* global history */
import { stringToLinkObj } from '../../utils/stringToLinkObj.js'
import Logger from 'logger'
import isAjaxLoading from '../../utils/isAjaxLoading.js'

const EVENTS = {
  request: 'VideoPageRoute_Route', // used by external components to change route
  change: 'VideoPageRoute_Change' // runs on route change
}

/**
 *
 * @param {String} selector
 * @param {Document|NodeList} Node in which to search for selector
 */
function NodeReplace (selector, ajaxDoc) {
  try {
    let doc = document
    let elFromAjaxDocument = ajaxDoc.querySelector(selector)
    let elFromDocument = doc.querySelector(selector)

    elFromDocument.replaceWith(elFromAjaxDocument)
  } catch (e) {
    Logger.warn(e, `${selector} - not in front end... It may need to be configured`)
  }
}

/**
 * MIXIN function.... Runs in the context of VideoPage.js
 * Anything that needs to be updated when the URL is changed should be controlled here
 */
export function videoPageRouterMixin () {
  this.emitter.on(EVENTS.request, (data) => {
    this.route(data.url)
  })

  /**
   *
   * @param {historyState} state with an href and a prevHref if available...
   * @returns {bool} determining if the path is different... It may just be a query change.
   */
  this.isNewPath = function (state) {
    const newUrl = stringToLinkObj(state.href)
    const prevUrl = stringToLinkObj(state.prevHref)
    return !prevUrl || newUrl.pathname !== prevUrl.pathname
  }

  this.runState = function (state) {
    if (this.isNewPath(state)) {
      isAjaxLoading(document.documentElement)
      window.fetch(state.href, {credentials: 'include'}).then((response) => {
        return response.text()
      }).then((text) => {
        const elTempDiv = document.createElement('div')
        elTempDiv.innerHTML = text
        NodeReplace(this.settings.leadPlayerWrap, elTempDiv)
        NodeReplace(this.settings.selComments, elTempDiv)
        NodeReplace(this.settings.selPageActions, elTempDiv)
        NodeReplace(this.settings.selBookmarkForm, elTempDiv)

        this.emitter.emit(EVENTS.change, {
          state: state
        })
        isAjaxLoading(document.documentElement, false)
      }).catch((e) => {
        isAjaxLoading(document.documentElement, false, true)
        Logger.error(e)
      })
    } else {
      this.emitter.emit(EVENTS.change, {
        state: state
      })
    }
  }

  this.isNewState = function (href) {
    return history.state && history.state.href !== href
  }

  this.route = function (url) {
    const linkObj = stringToLinkObj(url)
    const href = `${linkObj.href}`

    if (this.isNewState(href)) {
      let state = {
        href: href,
        prevHref: history.state.href
      }

      history.pushState(state, href, href)
      this.runState(state)
    }
  }

  this.initRouting = function () {
    const href = window.location.href
    let state = {
      href: href,
      prevHref: null
    }
    history.replaceState(state, href, href)

    this.emitter.emit(EVENTS.change, {
      state: state
    })

    window.onpopstate = (e) => {
      if (e.state !== null) { // ignore on hash changes
        this.runState(e.state)
      }
    }
  }

  this.initRouting()
}
