/* eslint-disable */
import $ from 'jquery'
import EventEmitter from 'event-emitter'
import MediaQueries from './../../utils/MediaQueries.js'
import { VideoPagePseudoPopup } from './VideoPagePseudoPopup.js'
import { eventDelegate } from '../../utils/eventDelegate.js'
import { BookmarkForm } from './../../community/bookmark/BookmarkForm.js'
import { TimeComments } from './TimeComments.js'
import { PlaylistCollection } from './PlaylistCollection.js'
import { videoPageRouterMixin } from './videoPage--RouterMixin.js'
import { CompanionScreen } from './CompanionScreen.js'
import { VideoPageAnalyticsDelegated } from './VideoPageAnalyticsDelegated'

const mq = new MediaQueries().mq
const DEFAULT = {
  selPageActions: '.VideoPage-actions',
  selPlayList: '#VideoPage-playlist',
  selPlayListContainer: '#VideoPage-playlistContainer',
  selAsideContainer: '#VideoPage-sidebar',
  dataSelBookmarks: 'data-bookmarks',
  dataSelChapters: 'data-chapters',
  selBookmarkForm: '.BookmarkForm',
  leadPlayerWrap: '.VideoPage-media[data-contains-embedded-video]',
  leadPlayer: '.CraftsyVideoPlayer, .HTML5VideoPlayer, .YouTubeVideoPlayer',
  selComments: '.VideoPage-comments',
  selCompanionScreen: '.CompanionScreen',
  selCompanionWatchLinks: '.VideoPage-materialModules a' // these interact with companion object
}

const EVENTS = {
  change: 'VideoPageRoute_Change', // runs on route change
  timeUpdate: 'VideoPage_Timeupdate',
  timeEnded: 'VideoPage_Timeended',
  playing: 'VideoPage_Playing'
}

export class VideoPage {
  constructor (el, settings) {
    this.settings = Object.assign({}, DEFAULT, settings)
    this.el = el
    this.emitter = new EventEmitter()
    this.VideoPagePseudoPopup = new VideoPagePseudoPopup(el)
    this.VideoPageAnalyticsDelegated = new VideoPageAnalyticsDelegated(el, {})
    this.init()
  }

  /**
   * @param {Bool} newPath notifies if the new route is also a different path... It could just be a query change
   */
  onNewRoute (newPath) {
    if (mq['mq-md'].matches) {
      window.scroll({ top: 0, left: 0, behavior: 'smooth' })
    }

    if (newPath) {
      this.elVideoPlayer = document.querySelector(this.settings.leadPlayerWrap).querySelector(this.settings.leadPlayer)
      this.$elVideoPlayer = $(this.elVideoPlayer)

      this.$elVideoPlayer.on('Video:onVideoPlaybackTimeUpdate', (e, data) => {
        this.emitter.emit(EVENTS.timeUpdate, {
          time: data.secondsElapsed
        })
      })

      this.$elVideoPlayer.on('Video:onAddBookmark', (e, data) => {
        if (!this.bookmarkForm) {
          throw new Error('TimedCommmenting activity not configured')
        }
        this.bookmarkForm.show()
      })

      this.$elVideoPlayer.on('Video:onVideoPlaying', () => {
        this.emitter.emit(EVENTS.playing)
      })

      this.$elVideoPlayer.on('Video:onVideoEnded', (e, data) => {
        this.emitter.emit(EVENTS.timeEnded, {
          time: data.secondsElapsed
        })
      })

      this.initBookmarkForm()
      this.initComments()
      this.VideoPageAnalyticsDelegated.fireNewRouteLogging(this.player.settings.videoTitle,this.player.settings.videoId,this.player.playlistId)
    }

    if (this.player.timeFromUrl !== null) { // if seek time, start playing video at $t time
      this.$elVideoPlayer.one('Video:onVideoLoaded', () => {
        this.player.seek(this.player.timeFromUrl)
      })
      this.player.seek(this.player.timeFromUrl)
    }
  }

  init () {
    this.emitter.on(EVENTS.change, (data) => {
      const state = data.state
      this.onNewRoute(this.isNewPath(state))
    })

    this.el.addEventListener('click', this)

    this.initPlayLists()
    this.initOrientationChange()
    this.initCompanionScreen()
    this.repositionPlayList()

    videoPageRouterMixin.call(this) // mixin for routing
  }

  evClick (e) {
    eventDelegate.call(this, e, this.settings.selCompanionWatchLinks, this.CompanionScreenOpenEv.bind(this))
  }

  handleEvent (e) {
    switch (e.type) {
      case 'click':
        this.evClick(e)
        break
    }
  }

  initPlayLists () {
    let elPlaylist = this.el.querySelector(this.settings.selPlayList)
    let $playlist = $(elPlaylist)

    if (elPlaylist) {
      this.playListCollection = new PlaylistCollection(elPlaylist, {
        emitter: this.emitter
      })

      $(window).resize((e) => this.repositionPlayList(e))
    }

    // click event handler for scrolling the sidebar div to the PlaylistItem that was clicked
    // $playlist.find('.PlaylistItem').on('click', function(e) {
    //   let $item = $(this)
    //   const isTogglerClick = $(e.target)[0].hasAttribute('data-playlistitem-toggler')
    //   const scrollOffset = $item[0].offsetTop - $('#VideoPage-playlist')[0].offsetTop

    //   if (!mq['mq-lg'].matches || isTogglerClick) {
    //     return true
    //   }

    //   $('#VideoPage-sidebar')[0].scroll({
    //     top: scrollOffset,
    //     left: 0,
    //     behavior: 'smooth'
    //   })
    // })
  }

  repositionPlayList () {
    const elPlaylist = this.el.querySelector(this.settings.selPlayList)
    const elPlayListContainer = this.el.querySelector(this.settings.selPlayListContainer)
    const asideContainer = this.el.querySelector(this.settings.selAsideContainer)
    const isInMobileLayout = elPlaylist.parentElement.classList.contains('VideoPage-playlistContainer')

    if (mq['mq-md'].matches) {
      if (isInMobileLayout) {
        asideContainer.append(elPlaylist)
      }
    } else {
      if (!isInMobileLayout) {
        elPlayListContainer.append(elPlaylist)
      }
    }
  }

  initCompanionScreen () {
    let elCompanionScreen = this.el.querySelector(this.settings.selCompanionScreen)

    if (elCompanionScreen) {
      this.companionScreen = new CompanionScreen(elCompanionScreen)
    }
  }

  CompanionScreenOpenEv (e) {
    const delegateTarget = e.delegateTarget
    const isInternalLink = delegateTarget.hostname === window.location.hostname

    if (this.companionScreen && isInternalLink) {
      e.preventDefault()
      e.stopPropagation()
      const mediaType = 'article' // TODO: get this dynamically

      this.companionScreen.goTo(delegateTarget.href, mediaType)
    }
  }

  initBookmarkForm () {
    let elBookmarkForm = this.el.querySelector(this.settings.selBookmarkForm)

    if (elBookmarkForm) {
      var tempBookMark

      elBookmarkForm.addEventListener('BookMarkForm_preFetch', (e) => {
        tempBookMark = {}
        tempBookMark.time = this.player.currentTime
        elBookmarkForm.querySelector('input[name="timestamp"]').value = tempBookMark.time
      })
      elBookmarkForm.addEventListener('BookMarkForm_OK', (e) => {
        // BLU-428 - removing this for initial release - bsh
        // tempBookMark.title = e.detail.bookmark.title
        // tempBookMark.type = 'bookmark'
        // this.player.player.addBookmark(tempBookMark)

        // TODO add logic to add to playlist
        elBookmarkForm.querySelector('textarea[name="body"]').value = ''
        tempBookMark = {}

        this.VideoPageAnalyticsDelegated.addBookmarkClick(e)
      })
      elBookmarkForm.addEventListener('BookMarkForm_Error', (e) => {
        tempBookMark = {}
      })
      this.bookmarkForm = new BookmarkForm(elBookmarkForm, {
        player: this.player,
        VideoPagePseudoPopup: this.VideoPagePseudoPopup
      })
    }
  }

  initComments () {
    const elComments = document.querySelector(this.settings.selComments)

    if (elComments) {
      const config = TimeComments.formatConfigData(elComments.querySelector('script[type="text/json"]').innerHTML)
      this.TimeCommentsObj = new TimeComments(elComments, config, {
        player: this.player,
        VideoPagePseudoPopup: this.VideoPagePseudoPopup
      })

      this.emitter.on(EVENTS.timeUpdate, (data) => {
        this.TimeCommentsObj.time = data.time
      })
    }
  }

  /**
   * When a mobile device or tablet rotates to the landscape, switch the player into fullscreen mode. When it's
   * rotated back to portrait, bring the player out of fullscreen mode.
   */
  initOrientationChange () {
    $(window).on('orientationchange', function (e) {
      if (mq['mq-lg'].matches) {
        return
      }

      let $player = $('.CraftsyVideoPlayer')
      const isPlayerFullscreen = ($player.find('.vjs-fullscreen').length > 0)

      if ((window.orientation == 90 && !isPlayerFullscreen) || (window.orientation != 90 && isPlayerFullscreen)) {
        $player.find('.theoplayer-container').addClass('theo-menu-opened')
        $player.find('.vjs-fullscreen-control').click()
      }
    })
  }

  get player () {
    return this.$elVideoPlayer.data('player-instance')
  }
}
