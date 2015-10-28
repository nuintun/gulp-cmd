/**
 * Created by nuintun on 2015/10/27.
 */

'use strict';

/**
 * Iterator
 * @param array
 * @constructor
 */
function Iterator(array){
  this.index = 0;
  this.array = Array.isArray(array) ? array : [];
}

/**
 * create the next item.
 * @returns {{done: boolean, value: undefined}}
 */
Iterator.prototype.next = function (){
  var done = this.index >= this.array.length;
  var value = !done ? this.array[this.index++] : undefined;

  return {
    done: done,
    value: value
  }
};

/**
 * exports module
 */
module.exports = {
  iterator: Iterator,
  series: function (array, iterator, done, context){
    // create a new iterator
    var it = new Iterator(array);

    // bind context
    if (arguments.length >= 4) {
      iterator = iterator.bind(context);
      done = done.bind(context);
    }

    /**
     * walk iterator
     * @param it
     */
    function walk(it){
      var item = it.next();

      if (item.done) {
        done();
      } else {
        iterator(item.value, function (){
          walk(it);
        });
      }
    }

    // run walk
    walk(it);
  }
};
