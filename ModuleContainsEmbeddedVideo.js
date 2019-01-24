/* eslint-disable no-unused-vars */
import $ from 'jquery'
import plugins from 'pluginRegistry'
import {bindAll} from '../../utils/bindAll.js'

const SEL_DATA_WRAPPER = 'data-contains-embedded-video'
const SEL_DATA_PLYR_STATE = 'data-plyrhelper-state'
const JQUERY_DATA_KEY = 'player-instance'
const COMPATIBLE_PLAYERS = '.CraftsyVideoPlayer, .HTML5VideoPlayer, .YouTubeVideoPlayer'

class ModuleContainsEmbeddedVideo {
  constructor (el) {
    this.el = el
    bindAll(this, ['evPlaying', 'evPaused', 'evEnded', 'evWaiting'])
    this.setBinds()
  }

  setBinds () {
    if (this.elPlayer) {
      const $elPlayer = $(this.elPlayer)
      const elTrigger = this.el.querySelector(`[${SEL_DATA_WRAPPER}-trigger]`)
      if (elTrigger) {
        elTrigger.addEventListener('click', () => {
          if ($elPlayer) {
            this.evWaiting()
            $elPlayer.data(JQUERY_DATA_KEY).play()
          }
        })
      }

      $elPlayer.on('Video:onVideoPlaybackStarted', this.evPlaying)
      $elPlayer.on('Video:onVideoPlaybackPaused', this.evPaused)
      $elPlayer.on('Video:onVideoEnded', this.evEnded)
    }
  }

  evWaiting () {
    this.state = 'waiting'
  }

  evEnded () {
    this.state = 'ended'
  }

  evPaused () {
    this.state = 'paused'
  }

  evPlaying () {
    this.state = 'playing'
  }

  set state (val) {
    if (val !== this._state) {
      this._state = val
      this.el.setAttribute(SEL_DATA_PLYR_STATE, val)
    }
    return this._state
  }

  get state () {
    return this._state
  }

  get elPlayer () {
    return this.el.querySelector(COMPATIBLE_PLAYERS)
  }
}

plugins.register(ModuleContainsEmbeddedVideo, `[${SEL_DATA_WRAPPER}]`)

export default {}
