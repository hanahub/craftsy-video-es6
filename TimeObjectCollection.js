import EventEmitter from 'event-emitter'
import Logger from 'logger'

const EVENTS = {
  add: 'TimeObjectCollection_Add',
  clear: 'TimeObjectCollection_Clear',
  remove: 'TimeObjectCollection_Remove'
}

const DEFAULTS = {
  remapRule: ({time, title, timeObjType}) => ({time, title, timeObjType})
}

export class TimeObjectCollection extends EventEmitter {
  constructor (data, settings) {
    super()
    this.settings = Object.assign({}, DEFAULTS, settings)
    this.data = new Map()

    // override spread to return ordered Array from Map
    this.data[Symbol.iterator] = function * () {
      yield * [...this.entries()].sort((a, b) => a[0] - b[0])
    }

    this.add(TimeObjectCollection.formatData(data))
  }

  get size () {
    return this.data.size
  }

  add (obj) {
    if (obj instanceof Array) { // if Array call add on each array item... empty array does nothing
      if (obj.length) {
        obj.forEach((iter) => {
          this.add(iter)
        })
      }
    } else {
      let cleanedObj = TimeObjectCollection.cleanTimeObject(obj, this.settings.remapRule)
      let time = parseFloat(cleanedObj.time)

      if (!this.data.has(time)) {
        this.data.set(time, [])
      }

      this.data.get(time).unshift(cleanedObj)
      this.emitSync(EVENTS.add, {
        added: cleanedObj
      })
    }
  }

  get (key) {
    return this.data.get(key)
  }

  clear () {
    this.data.clear()
    this.emit(EVENTS.clear)
  }

  remove (obj) { // TODO
    // look up item to remove
    this.emit(EVENTS.remove, {
      removed: obj
    })
  }

  /**
   * findObjByTimeAndKey is useful for finding specific objects in data
   * @param {Float} time represents the float key in the TimeObjectCollection
   * @param {String} key represents the key to uniquely identify the object. typically 'id'
   * @param {String} value represents value the key must match
   */
  findObjByTimeAndKey (time, key, value) {
    try {
      let timeEntries = this.data.get(time)
      return timeEntries.find(function (timeObj) {
        return timeObj[key] === value
      })
    } catch (e) {
      Logger.error(`Could not find time entry at ${time}, with ${time} matchin ${value}`)
    }
  }

  /**
   * cleanTimeObject cleans each object to have only the necessary keys title, time, timeObjType
   * @param {Object} each Object which has title, time, timeObject
   */
  static cleanTimeObject (obj, remapRule) {
    if (!obj.time) {
      if (obj.timeStamp) {
        obj.time = obj.timeStamp
      }
      if (obj.timestamp) {
        obj.time = obj.timestamp
      }
      if (!obj.time) {
        Logger.warn(obj, 'object missing time...  defaulting to 0')
        obj.time = obj.time || 0
      }
    }

    if (!obj.publishDateMs && obj.published) {
      obj.publishDateMs = new Date(obj.published).getTime()
    }

    if (remapRule) {
      return (remapRule)(obj)
    } else {
      return obj
    }
  }

  /**
   * formatData process stringified Arrays to return the JS data
   * @param {String} data represents the json string form a data attribute... if it isnt json this function returns []
   * @param {String} objModifier modifies stored data, to include additional keys
   * This normalizes timestamp to be time
   */
  static formatData (data, objModifier) {
    let arr
    if (!(data instanceof Array)) {
      try {
        arr = JSON.parse(data) || []
      } catch (e) {
        Logger.warn('Data is not JSON, setting as empty array', e)
        arr = []
      }
      arr = arr || []
    } else {
      arr = data
    }

    if (objModifier) {
      return arr.map((obj) => {
        return Object.assign({}, obj, objModifier)
      })
    } else {
      return arr
    }
  }
}

TimeObjectCollection.prototype.hasKey = function (value) {
  const _timeKeys = [...this.data.keys()]
  return _timeKeys.indexOf(value) >= 0
}

TimeObjectCollection.prototype.getClosestSmaller = function (value) {
  this._lookupForArr = value
  const _timeKeys = [...this.data.keys()]
  return _timeKeys.reduce(this.reduceSmaller.bind(this), Number.NEGATIVE_INFINITY)
}

TimeObjectCollection.prototype.getClosestBigger = function (value) {
  this._lookupForArr = value
  const _timeKeys = [...this.data.keys()]
  return _timeKeys.reduce(this.reduceBigger.bind(this), Number.POSITIVE_INFINITY)
}

TimeObjectCollection.prototype.reduceSmaller = function (currentClosest, currentValue) {
  return (currentClosest < currentValue) && (currentValue < this._lookupForArr) ? currentValue : currentClosest
}

TimeObjectCollection.prototype.reduceBigger = function (currentClosest, currentValue) {
  return (currentClosest > currentValue) && (currentValue > this._lookupForArr) ? currentValue : currentClosest
}
