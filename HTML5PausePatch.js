// This patch ensures Safari pauses, see BLU-408
export class HTML5PausePatch {
  constructor (el) {
    el.addEventListener('pause', function () {
      this.pause()
    })
  }
}
