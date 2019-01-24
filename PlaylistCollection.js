import { PlaylistItem } from './PlaylistItem.js'
import { TimeObjectCollection } from './TimeObjectCollection.js'

const DEFAULT = {
  selPlayListItem: '.PlaylistItem',
  dataSelActive: 'data-playlistitemactive',
  dataSelPlaying: 'data-playlistitemplaying',
  emitter: null // required
}

export class PlaylistCollection {
  items = []

  constructor (el, settings) {
    this.settings = Object.assign({}, DEFAULT, settings)
    this.el = el
    this.emitter = this.settings.emitter
    let elPlaylistItems = [...this.el.querySelectorAll(this.settings.selPlayListItem)]

    elPlaylistItems.forEach((elPlayListItem, index) => {
      let PlaylistObj = new PlaylistItem(elPlayListItem, {
        dataSelActive: this.settings.dataSelActive,
        dataSelPlaying: this.settings.dataSelPlaying,
        collectionInstance: this,
        emitter: this.emitter
      })

      const arr = [
        ...TimeObjectCollection.formatData(elPlayListItem.getAttribute('data-chapters'), {timeObjType: 'chapter'})
      ]

      PlaylistObj.add(arr)
      this.items.push(PlaylistObj)
    })

    this.emitter.on('VideoPage_Timeended', () => {
      if (this.activeItem.nexSibling) {
        this.activeItem.nexSibling.go()
      }
    })

    this.emitter.on('VideoPage_Playing', () => {
      this.activeItem.el.setAttribute(this.settings.dataSelPlaying, true)
    })
  }

  get activeItem () {
    const activeItem = this.items.find((item) => {
      return item.active
    })
    const activeIndex = this.items.indexOf(activeItem)
    const mod = {}
    if (activeIndex > 0) {
      mod.previousSibling = this.items[activeIndex - 1]
    }
    if (activeIndex < this.items.length - 1) {
      mod.nexSibling = this.items[activeIndex + 1]
    }
    return Object.assign({}, activeItem, mod)
  }
}
