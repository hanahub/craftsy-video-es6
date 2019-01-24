/* eslint no-inner-declarations: 0 */
/**
 * This creates pseudo popupups for the video page...
 * Pseudo because it really just adds data attributes to the this.el and the target
 *
 * Adds data attribute to el, and target
 * Removes data attribte to el and target.... El keeps data attribtue until all targets are closed for the case of multiple views
 */
import { eventDelegate } from '../../utils/eventDelegate.js'

const DATA_SEL = 'data-videopage-popup'

export class VideoPagePseudoPopup {
  constructor (el) {
    this.el = el
    this.openViews = new Set()
    this.setBinds()
  }

  setBinds () {
    this.el.addEventListener('click', this)
  }

  handleEvent (e) {
    switch (e.type) {
      case 'click':
        this.evClick(e)
        break
    }
  }

  evClick (e) {
    eventDelegate.call(this, e, `[${DATA_SEL}-cancel]`, this.popupCancelClicked.bind(this))
  }

  popupCancelClicked (e) {
    e.preventDefault()
    e.stopPropagation()
    const elDelegate = e.delegateTarget
    const elTargetView = elDelegate.closest(`[${DATA_SEL}-view="true"]`)
    this.close(elTargetView)
  }

  /**
   * Adds attributes to 'el' and to target. Stores reference to target. CSS opens popup
   * @param {String|DOMNode} elTarget
   */
  open (elTarget) {
    elTarget = VideoPagePseudoPopup.grabNode(elTarget)
    this.openViews.add(elTarget)
    elTarget.setAttribute(`${DATA_SEL}-view`, true)
    this.el.setAttribute(`${DATA_SEL}`, true)
  }

  isOpen (elTarget) {
    return this.openViews.has(elTarget)
  }

  /**
   * Removes attributes added by this.open, as well as reference... 'el' Keeps data attributes until all references are closed
   * @param {*} elTarget
   */
  close (elTarget) {
    function close (elTarget) {
      elTarget = VideoPagePseudoPopup.grabNode(elTarget)
      this.openViews.delete(elTarget)
      elTarget.removeAttribute(`${DATA_SEL}-view`, true)
    }

    if (elTarget) {
      close.call(this, elTarget)
    } else {
      this.openViews.forEach((elTarget) => {
        close.call(this, elTarget)
      })
    }

    if (this.openViews.size === 0) {
      this.el.removeAttribute(`${DATA_SEL}`, true)
    }
  }

  static grabNode (elTarget) {
    if (typeof elTarget === 'string') {
      elTarget = this.el.querySelector(elTarget)
    }
    return elTarget
  }
}
