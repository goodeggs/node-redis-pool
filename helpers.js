module.exports = {
  mergeOptions: function(obj1, obj2) {
    var obj3 = {};
    if (typeof obj1 == 'object') {
      for (var attrname in obj1) { obj3[attrname] = obj1[attrname]; }
    }
    if (typeof obj2 == 'object') {
      for (var attrname in obj2) { obj3[attrname] = obj2[attrname]; }
    }
    return obj3;
  },
  removeArrayEl: function(arr, el) {
    if (arr.indexOf(el) !== -1) {
      arr.splice(arr.indexOf(el), 1);
    }
  }
}