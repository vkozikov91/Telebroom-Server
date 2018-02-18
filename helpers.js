'use strict';

Array.prototype.unduplicatedBy = function (field) {
    var uniqueItems = [];
    return this.filter(function (elem, index, self) {
        if (uniqueItems.indexOf(elem[field]) == -1) {
            uniqueItems.push(elem[field]);
            return true;
        }
        return false;
    })
}

Array.prototype.remove = function (element) {
    const index = this.indexOf(element);
    if (index !== -1) {
        this.splice(index, 1);
    }
}

Array.prototype.first = function () {
    if (this.length == 0) {
        return null;
    }
    return this[0];
}

Array.prototype.last = function () {
    if (this.length == 0) {
        return null;
    }
    let lastElementIndex = this.length - 1;
    return this[lastElementIndex];
}

Array.prototype.contains = function (element) {
    return this.indexOf(element) > -1;
};
