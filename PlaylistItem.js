/**
 * IMPORTANT: Not to be use standalone, this Playlist item manages the bookmarks, and chapters list...
 * It should be used along a page or module class containing a video player
 */
/* eslint-disable no-unused-vars */

import $ from 'jquery'
import MediaQueries from './../../utils/MediaQueries.js'
import { TimeObjectCollection } from './TimeObjectCollection.js'
import { stringToLinkObj } from '../../utils/stringToLinkObj.js'
import { eventDelegate } from '../../utils/eventDelegate.js'
import { arrayGetClosestNum } from '../../utils/arrayGetClosestNum.js'

const URL_SEEKTIME_PARAM = 't' // play video at $t time
const DEFAULT = {
  selMainLink: '.PlaylistItem-lead',
  selTitle: '.PlaylistItem-title',
  dataSelListExpanded: 'data-playlistitem-expanded',
  dataSelNewestTimeMatch: 'data-playlisttimeobject-newest-at-time',
  dataSelToggler: 'data-playlistitem-toggler',
  dataSelTimeObjectsList: 'data-timeobjectlist',
  dataSelTimeObjectsListItem: 'data-timeobjecttype',
  dataSelActive: 'data-playlistitemactive',
  dataSelPlaying: 'data-playlistitemplaying',
  emitter: null // required
}

const EXTERNAL_EVENTS = {
  route: 'VideoPageRoute_Route',
  change: 'VideoPageRoute_Change',
  timeUpdate: 'VideoPage_Timeupdate'
}

const mq = new MediaQueries().mq

/**
 * Playlist item stores timeobjects which are rendered as a list, chronologically based on their time property
 */
export class PlaylistItem {
  constructor (el, settings) {
    this.settings = Object.assign({}, DEFAULT, settings)
    this.emitter = this.settings.emitter
    this.el = el
    this.cleanTitleText()
    this.link = stringToLinkObj(this.el.getAttribute('data-ajax-url'))

    const elToggler = document.createElement('div')
    elToggler.setAttribute(this.settings.dataSelToggler, '')

    this.el.appendChild(elToggler)

    this.timeObjects = new TimeObjectCollection([])

    this.setBinds()
  }

  /**
   * TODO: Optionally BE exclusion of the word episode in title, would avoid needing this
   */
  cleanTitleText () {
    const elTitleLink = this.el.querySelector(this.settings.selTitle).querySelector('a')
    elTitleLink.innerText = elTitleLink.innerText.replace(/Episode: /ig, '')
  }

  add (data) {
    this.timeObjects.add(data)
  }

  reset () {
    this.timeObjects.clear()
  }

  checkIfToActivate () {
    let matchesCurrentPath = this.link.pathname === window.location.pathname
    if (matchesCurrentPath) {
      this.active = true
    } else {
      this.active = false
    }
  }

  handleEvent (e) {
    switch (e.type) {
      case 'click':
        e.preventDefault()
        e.stopPropagation()
        eventDelegate.call(this, e, `${this.settings.selMainLink}`, this.mainLinkClickEv.bind(this))
        eventDelegate.call(this, e, `[${this.settings.dataSelToggler}]`, this.togglerClickEv.bind(this))
        eventDelegate.call(this, e, `[${this.settings.dataSelTimeObjectsListItem}]`, this.subItemClickEv.bind(this))
        break
    }
  }

  togglerClickEv (e) {
    e.preventDefault()
    this.el.hasAttribute(this.settings.dataSelListExpanded) ? this.el.removeAttribute(this.settings.dataSelListExpanded) : this.el.setAttribute(this.settings.dataSelListExpanded, '')
  }

  /**
   * @param {Int} [time] at which to start video
   */
  go (time) {
    time = time || 0
    const href = this.link.href
    const url = href.includes('?') ? `${href}&${URL_SEEKTIME_PARAM}=${time}` : `${href}?${URL_SEEKTIME_PARAM}=${time}`
    this.emitter.emit(EXTERNAL_EVENTS.route, {
      url: url
    })
  }

  mainLinkClickEv (e) {
    e.preventDefault()
    this.clearBestMatchingTimeMark()
    this.go()
  }

  subItemClickEv (e) {
    let time = parseInt(e.target.getAttribute('data-videojumpto'), 10)

    this.go(time)
    this.markBestMatchingTimeObjectForTime(time)

    // only scroll to selected subItem on desktop
    if (mq['mq-lg'].matches) {
      const scrollOffset = $(this.el).offset().top - $('#VideoPage-playlist').offset().top

      $('#VideoPage-sidebar')[0].scroll({
        top: scrollOffset,
        left: 0,
        behavior: 'smooth'
      })
    }
  }

  setBinds () {
    this.el.addEventListener('click', this)

    this.emitter.on(EXTERNAL_EVENTS.change, () => {
      this.checkIfToActivate()
    })

    this.emitter.on(EXTERNAL_EVENTS.timeUpdate, (data) => {
      if (this.active) {
        this.time = data.time
      }
    })

    this.timeObjects.on('TimeObjectCollection_Add', (data) => {
      this.render(data.added)
    })

    this.timeObjects.on('TimeObjectCollection_Clear', () => {
      this.render()
    })
  }

  render (data) {
    if (data) {
      const time = data.time
      let mapKey = arrayGetClosestNum(time, [...this.timeObjects.data.keys()])
      let elClosest = [...this.elItemList.querySelectorAll(`[data-videojumpto='${mapKey}']`)]

      if (elClosest) {
        elClosest = elClosest[elClosest.length - 1]
      }

      const elLi = document.createElement('li')
      elLi.setAttribute('data-videojumpto', time)

      elLi.setAttribute(this.settings.dataSelTimeObjectsListItem, data.timeObjType)
      elLi.innerText = data.title

      if (!elClosest) { // just append if value is lower
        this.elItemList.appendChild(elLi)
      } else {
        if (mapKey !== time) {
          elClosest.parentNode.insertBefore(elLi, elClosest)
        } else {
          elClosest.parentNode.insertBefore(elLi, elClosest.nextSibling)
        }
      }
    }

    if (this.timeObjects.size) {
      this.el.setAttribute('data-timeobjectscount', this.timeObjects.size)
    }
  }

  clearBestMatchingTimeMark () {
    $('#VideoPage-playlist').find('[data-timeobjecttype="chapter"][' + this.settings.dataSelNewestTimeMatch + ']').removeAttr(this.settings.dataSelNewestTimeMatch)
  }

  markBestMatchingTimeObjectForTime (time) {
    time = time || Math.floor(this.time)

    const mapKey = this.timeObjects.hasKey(time) ? time : this.timeObjects.getClosestSmaller(time)

    this.clearBestMatchingTimeMark()

    let _markedLiItem = this.elItemList.querySelector(`[data-timeobjecttype='chapter'][data-videojumpto='${mapKey}']`)
    if (_markedLiItem) {
      _markedLiItem.setAttribute(this.settings.dataSelNewestTimeMatch, '')
    }
  }

  get elItemList () {
    if (!this._elItemList) {
      this._elItemList = document.createElement('ul')
      this._elItemList.setAttribute(this.settings.dataSelTimeObjectsList, '')
      this.el.appendChild(this._elItemList)
    }
    return this._elItemList
  }

  get active () {
    return this._active
  }

  set active (val) {
    if (val !== this._active) {
      this._active = val

      if (val) {
        this.el.setAttribute(this.settings.dataSelActive, true)
        this.el.setAttribute(this.settings.dataSelPlaying, false)
        this.el.setAttribute(this.settings.dataSelListExpanded, '')
      } else {
        this.el.removeAttribute(this.settings.dataSelActive)
        this.el.removeAttribute(this.settings.dataSelPlaying)
        this.el.removeAttribute(this.settings.dataSelListExpanded)
      }
    }
    return this._active
  }

  get time () {
    return this._time || 0
  }

  set time (val) {
    val = Math.floor(val)
    if (val !== this._time) {
      const prevVal = Math.floor(this._time)

      if (val !== prevVal) {
        this.markBestMatchingTimeObjectForTime(val)
      }

      this._time = val
    }
    return this._time
  }
}
