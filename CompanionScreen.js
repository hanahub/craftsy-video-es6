import { eventDelegate } from '../../utils/eventDelegate.js'

const BlockName = 'CompanionScreen'

const DEFAULTS = {
  selectors: {
    screenContent: '.CompanionScreen-content',
    screenControls: '.CompanionScreen-controls',
    drawerOpen: 'data-is-open',
    controlsCloseButton: '.CompanionScreen-controls-closeButton',
    scrollableContainer: '.ScrollableContentContainer'
  }
}

const HTML_FOR_ERROR = '<div class="Error">There was a problem loading the piece of content</div>'

export class CompanionScreen {
  constructor (el) {
    this.settings = Object.assign(this, DEFAULTS)
    this.el = el
    this.elContent = el.querySelector(this.selectors.screenContent)
    this.setBinds()
  }

  evClick (e) {
    eventDelegate.call(this, e, this.selectors.controlsCloseButton, this.controlsCloseClickEv.bind(this))
  }

  handleEvent (e) {
    switch (e.type) {
      case 'click':
        this.evClick(e)
        break
    }
  }

  setBinds () {
    this.el.addEventListener('click', this)
  }

  controlsCloseClickEv (e) {
    this.close()
  }

  close () {
    this.el.removeAttribute(this.selectors.drawerOpen)
    this.el.removeAttribute('data-media-type')
    document.body.removeAttribute('data-secondscreen-is-open')
    this.el.removeAttribute('data-article-max')
  }

  open (mediaType) {
    mediaType = mediaType || 'article'
    this.el.setAttribute(this.selectors.drawerOpen, true)
    this.el.setAttribute('data-media-type', mediaType)

    document.body.setAttribute('data-secondscreen-is-open', '')
  }

  /**
   *
   * @param {String} url of content
   * @param {String} mediaType use for data-attr. Which is used for icon styling
   */
  goTo (url, mediaType) {
    this.elContent.innerHTML = ''
    this.open(mediaType)
    this.el.setAttribute('data-media-type', mediaType)
    window.scroll({top: 0, left: 0, behavior: 'smooth'})

    this.fetchContent(url).then((text) => {
      const elAjaxDoc = document.createElement('div')
      elAjaxDoc.innerHTML = text

      const elScrollContainer = elAjaxDoc.querySelector(this.selectors.scrollableContainer)
      const elReadMore = document.createElement('a')
      elReadMore.innerText = 'Read More'
      elReadMore.className = `${BlockName}-ReadMore`
      elReadMore.href = url
      this.elContent.innerHTML = ''

      this.elContent.appendChild(elScrollContainer)
      this.elContent.appendChild(elReadMore)
    }).catch((e) => {
      window.console.error(e)
      this.elContent.innerHTML = HTML_FOR_ERROR
      setTimeout(() => {
        this.close()
      }, 2000)
    })
  }

  /**
   * fetchContent makes a request and caches it... if cached it loads it from clientside cache
   * @param {String} url to which to make GET request
   * @param {options} options for fetch API
   */
  fetchContent (url, options) {
    this._cache = this._cache || {}
    options = options || {credentials: 'include'}

    if (url in this._cache) {
      return this._cache[url]
    } else {
      return window.fetch(url, {credentials: 'include'}).then((response) => {
        this._cache[url] = response.text()
        return this._cache[url]
      })
    }
  }
}
