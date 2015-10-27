/**
 * Created by nuintun on 2015/10/27.
 */

/**
 * Iterator
 * @param array
 * @constructor
 */

function Iterator(array){
  this._index = 0;
  this._array = array;
}

/**
 * create the next item.
 * @returns {{done: boolean, value: undefined}}
 */
Iterator.prototype.next = function (){
  var done = this._index >= this._array.length;
  var value = !done ? this._array[this._index++] : undefined;

  return {
    done: done,
    value: value
  }
};

/**
 * exports module
 */
module.exports = Iterator;
