function crossfilter() {
  var crossfilter = {
    add: add,
    remove: remove,
    dimension: dimension,
    groupAll: groupAll,
    size: size
  };

  var data = [], // the records
      n = 0, // the number of records; data.length
      m = 0, // number of dimensions in use
      M = 8, // number of dimensions that can fit in `filters`
      filters = crossfilter_array8(0), // M bits per record; 1 is filtered out
      filterListeners = [], // when the filters change
      dataListeners = []; // when data is added
      removeListeners = []; // when data is removed
      positions = []; // for resetting dimension positions 
       
  // Adds the specified new records to this crossfilter.
  function add(newData) {
    var n0 = n,
        n1 = newData.length;

    // If there's actually new data to add…
    // Merge the new data into the existing data.
    // Lengthen the filter bitset to handle the new records.
    // Notify listeners (dimensions and groups) that new data is available.
    if (n1) {
      data = data.concat(newData);
      filters = crossfilter_arrayLengthen(filters, n += n1);
      dataListeners.forEach(function(l) { l(newData, n0, n1); });
    }

    return crossfilter;
  }
  // remove data from this crossfilter
  function remove(records) {
    records = [].concat(records) // make sure we have an array
    var ll = records.length,
        ret = [],
        i, pos;
    
     for (i = 0; i < ll; ++i) {
          if((pos = data.indexOf(records[i])) > -1) {
              n--;
              (ret[0] && (pos > ret[0])) ? ret.splice(0,0,pos) :ret.push(pos)
          }    
       }
     ll = ret.length;
     removeListeners.forEach(function(l) { l(ret); });
     for (i = 0; i < ll; ++i) {data.splice(ret[i], 1);}
 
    return crossfilter;
  }

  // Adds a new dimension with the specified value accessor function.
  function dimension(value) {
    var dimension = {
      filter: filter,
      filterExact: filterExact,
      filterRange: filterRange,
      filterAll: filterAll,
      top: top,
      bottom: bottom,
      group: group,
      groupAll: groupAll,
      remove: remove // remove this dimension (as opposed to remove data from this crossfilter)
    };

var position = m++,
      one = 1 << position, // bit mask, e.g., 00001000
// var one = 1 << m++, // bit mask, e.g., 00001000
        zero = ~one, // inverted one, e.g., 11110111
        values, // sorted, cached array
        index, // value rank ↦ object id
        newValues, // temporary array storing newly-added values
        newIndex, // temporary array storing newly-added index
        sort = quicksort_by(function(i) { return newValues[i]; }),
        refilter = crossfilter_filterAll, // for recomputing filter
        indexListeners = [], // when data is added
        lo0 = 0,
        hi0 = 0,
        union = false,
        resetNeeded = false,
        dimRemoveListeners = []; // track listeners for dimension removal;

    // Updating a dimension is a two-stage process. First, we must update the
    // associated filters for the newly-added records. Once all dimensions have
    // updated their filters, the groups are notified to update.
    dataListeners.unshift(preAdd);
    dataListeners.push(postAdd);
    removeListeners.push(removeData);
    dimRemoveListeners.push(preAdd);
    dimRemoveListeners.push(postAdd);
    
    // Incorporate any existing data into this dimension, and make sure that the
    // filter bitset is wide enough to handle the new dimension.
    if (m > M) filters = crossfilter_arrayWiden(filters, M <<= 1);
    preAdd(data, 0, n);
    postAdd(data, 0, n);
   
    function removeData(pos) {
      var le = pos.length,
            l = n + le,
            toRem = [],
            shift = 0, 
            current, i, ii, k, bounds; 
    filterListeners.forEach(function(l) { l(one, [], pos, false, true); });
     for (i = 0; i < le; ++i) {
      for (ii = 0; ii < ( l - i); ++ii) {
        current = pos[i];
        if(!shift && (index[ii] == current)) {
            shift = 1;
            toRem[ii> toRem[0] ? 'unshift' : 'push'](ii)
            }
        index[ii] = index[ii + shift];   
        }
        shift = 0
     }        
     
      for (i = 0; i < toRem.length; ++i) {values.splice(toRem[i],1)};
      index = index.subarray(0,n);
      bounds = refilter(values); 
      lo1 = bounds[0], hi1 = bounds[1];   
      toRemoveIndex = null;   
      
    }
     
    // Incorporates the specified new records into this dimension.
    // This function is responsible for updating filters, values, and index.
    function preAdd(newData, n0, n1) {

      // Permute new values into natural order using a sorted index.
      newValues = newData.map(value);
      newIndex = sort(crossfilter_range(n1), 0, n1);
      newValues = permute(newValues, newIndex);

      // Bisect newValues to determine which new records are selected.
      var bounds = refilter(newValues), lo1 = bounds[0], hi1 = bounds[1], i;
      for (i = 0; i < lo1; ++i) filters[newIndex[i] + n0] |= one;
      for (i = hi1; i < n1; ++i) filters[newIndex[i] + n0] |= one;

      // If this dimension previously had no data, then we don't need to do the
      // more expensive merge operation; use the new values and index as-is.
      if (!n0) {
        values = newValues;
        index = newIndex;
        lo0 = lo1;
        hi0 = hi1;
        return;
      }

      var oldValues = values,
          oldIndex = index,
          i0 = 0,
          i1 = 0;

      // Otherwise, create new arrays into which to merge new and old.
      values = new Array(n);
      index = crossfilter_index(n, n);

      // Merge the old and new sorted values, and old and new index.
      for (i = 0; i0 < n0 && i1 < n1; ++i) {
        if (oldValues[i0] < newValues[i1]) {
          values[i] = oldValues[i0];
          index[i] = oldIndex[i0++];
        } else {
          values[i] = newValues[i1];
          index[i] = newIndex[i1++] + n0;
        }
      }

      // Add any remaining old values.
      for (; i0 < n0; ++i0, ++i) {
        values[i] = oldValues[i0];
        index[i] = oldIndex[i0];
      }

      // Add any remaining new values.
      for (; i1 < n1; ++i1, ++i) {
        values[i] = newValues[i1];
        index[i] = newIndex[i1] + n0;
      }

      // Bisect again to recompute lo0 and hi0.
      bounds = refilter(values), lo0 = bounds[0], hi0 = bounds[1];
    }

    // When all filters have updated, notify index listeners of the new values.
    function postAdd(newData, n0, n1) {
      indexListeners.forEach(function(l) { l(newValues, newIndex, n0, n1); });
      newValues = newIndex = null;
    }

    // Updates the selected values based on the specified bounds [lo, hi].
    // This implementation is used by all the public filter methods.
    function filterIndex(bounds) {
      var i,
          j,
          k,
          lo1 = bounds[0],
          hi1 = bounds[1],
          added = [],
          removed = [],
          reset = resetNeeded || union;

      if (resetNeeded) {
        for (i = 0; i < n; ++i) filters[index[i]] |= one;
        lo0 = 0;
        hi0 = 0;
        resetNeeded = false;
      }
      if (union) {
        for (i = lo1; i < hi1; ++i) filters[index[i]] &= zero;
        if (lo0 > lo1) lo0 = lo1;
        if (hi0 < hi1) hi0 = hi1;
      } else {
        // Fast incremental update based on previous lo index.
        if (lo1 < lo0) {
          for (i = lo1, j = Math.min(lo0, hi1); i < j; ++i) {
            filters[k = index[i]] ^= one;
            added.push(k);
          }
        } else if (lo1 > lo0) {
          for (i = lo0, j = Math.min(lo1, hi0); i < j; ++i) {
            filters[k = index[i]] ^= one;
            removed.push(k);
          }
        }

        // Fast incremental update based on previous hi index.
        if (hi1 > hi0) {
          for (i = Math.max(lo1, hi0), j = hi1; i < j; ++i) {
            filters[k = index[i]] ^= one;
            added.push(k);
          }
        } else if (hi1 < hi0) {
          for (i = Math.max(lo0, hi1), j = hi0; i < j; ++i) {
            filters[k = index[i]] ^= one;
            removed.push(k);
          }
        }
        lo0 = lo1;
        hi0 = hi1;
      }
      filterListeners.forEach(function(l) { l(one, added, removed, reset); });
      return dimension;
    }

    // Filters this dimension using the specified range, value, or null.
    // If the range is null, this is equivalent to filterAll.
    // If the range is an array, this is equivalent to filterRange.
    // Otherwise, this is equivalent to filterExact.
    // Multiple arguments are treated as a union operation.
    function filter(range) {
      if (arguments.length > 1) {
        for (var i = 0, n = arguments.length; i < n; ++i) {
          if (i === 1) union = true;
          (Array.isArray(range = arguments[i]) ? filterRange : filterExact)(range);
        }
        union = false;
        resetNeeded = true;
        return dimension;
      } else {
        return range == null
          ? filterAll() : Array.isArray(range)
          ? filterRange(range) : typeof range === "function"
          ? filterFunction(range)
          : filterExact(range);
      }
    }

    // Filters this dimension to select the exact value.
    function filterExact(value) {
      return filterIndex((refilter = crossfilter_filterExact(bisect, value))(values));
    }

    // Custom filter function.
    function filterFunction(f) {
      resetNeeded = true;
      for (var i = 0; i < n; ++i) {
        if (f(values[i], i)) filters[index[i]] &= zero;
        else filters[index[i]] |= one;
      }
      lo0 = 0;
      lo1 = n;
      filterListeners.forEach(function(l) { l(one, [], [], true); });
      return dimension;
    }

    // Filters this dimension to select the specified range [lo, hi].
    // The lower bound is inclusive, and the upper bound is exclusive.
    function filterRange(range) {
      return filterIndex((refilter = crossfilter_filterRange(bisect, range))(values));
    }

    // Clears any filters on this dimension.
    function filterAll() {
      return filterIndex((refilter = crossfilter_filterAll)(values));
    }

    // Returns the top K selected records based on this dimension's order.
    // Note: observes this dimension's filter, unlike group and groupAll.
    function top(k) {
      var array = [],
          i = hi0,
          j;

      while (--i >= lo0 && k > 0) {
        if (!filters[j = index[i]]) {
          array.push(data[j]);
          --k;
        }
      }

      return array;
    }

    // Returns the bottom K selected records based on this dimension's order.
    // Note: observes this dimension's filter, unlike group and groupAll.
    function bottom(k) {
      var array = [],
          i = lo0,
          j;

      while (i < hi0 && k > 0) {
        if (!filters[j = index[i]]) {
          array.push(data[j]);
          --k;
        }
        i++;
      }

      return array;
    }

    // Adds a new group to this dimension, using the specified key function.
    function group(key) {
      var group = {
        top: top,
        all: all,
        reduce: reduce,
        reduceCount: reduceCount,
        reduceSum: reduceSum,
        order: order,
        orderNatural: orderNatural,
        size: size,
        pivot: pivot,
        idx: idx // allow returning objectid -> groupId index. usefull for pivot projections.  
      };

      var groups, // array of {key, value}
          groupIndex, // object id ↦ group id
          groupWidth = 8,
          groupCapacity = crossfilter_capacity(groupWidth),
          k = 0, // cardinality
          select,
          heap,
          reduceAdd,
          reduceRemove,
          reduceInitial,
          pivotGroups = [], //array of groups to project reduce functions to 
          update = crossfilter_null,
          reset = crossfilter_null,
          resetNeeded = true;

      if (arguments.length < 1) key = crossfilter_identity;

      // The group listens to the crossfilter for when any dimension changes, so
      // that it can update the associated reduce values. It must also listen to
      // the parent dimension for when data is added, and compute new keys.
      filterListeners.push(update);
      dimRemoveListeners.push(update);
      indexListeners.push(add);

      // Incorporate any existing data into the grouping.
      add(values, index, 0, n);
      
      // Return the groupIndex (used for perfoming pivot reduce function) 
       function idx() {return groupIndex}
       
       function pivot() {
           if (arguments.length < 1) return pivotGroups
           pivotGroups = [].concat(arguments[0]);
           resetNeeded = true;
           return group
       }
       
      // Incorporates the specified new values into this group.
      // This function is responsible for updating groups and groupIndex.
      function add(newValues, newIndex, n0, n1) {
        var oldGroups = groups,
            reIndex = crossfilter_index(k, groupCapacity),
            add = reduceAdd,
            initial = reduceInitial,
            k0 = k, // old cardinality
            i0 = 0, // index of old group
            i1 = 0, // index of new record
            j, // object id
            g0, // old group
            x0, // old key
            x1, // new key
            g, // group to add
            x; // key of group to add

        // If a reset is needed, we don't need to update the reduce values.
        if (resetNeeded) add = initial = crossfilter_null;

        // Reset the new groups (k is a lower bound).
        // Also, make sure that groupIndex exists and is long enough.
        groups = new Array(k), k = 0;
        groupIndex = k0 > 1 ? crossfilter_arrayLengthen(groupIndex, n) : crossfilter_index(n, groupCapacity);

        // Get the first old key (x0 of g0), if it exists.
        if (k0) x0 = (g0 = oldGroups[0]).key;

        // Find the first new key (x1), skipping NaN keys.
        while (i1 < n1 && !((x1 = key(newValues[i1])) >= x1)) ++i1;

        // While new keys remain…
        while (i1 < n1) {

          // Determine the lesser of the two current keys; new and old.
          // If there are no old keys remaining, then always add the new key.
          if (g0 && x0 <= x1) {
            g = g0, x = x0;

            // Record the new index of the old group.
            reIndex[i0] = k;

            // Retrieve the next old key.
            if (g0 = oldGroups[++i0]) x0 = g0.key;
          } else {
            g = {key: x1, value: initial()}, x = x1;
          }

          // Add the lesser group.
          groups[k] = g;

          // Add any selected records belonging to the added group, while
          // advancing the new key and populating the associated group index.
          while (!(x1 > x)) {
            groupIndex[j = newIndex[i1] + n0] = k;
            if (!(filters[j] & zero)) g.value = add(g.value, data[j]);
            if (++i1 >= n1) break;
            x1 = key(newValues[i1]);
          }

          groupIncrement();
        }

        // Add any remaining old groups that were greater than all new keys.
        // No incremental reduce is needed; these groups have no new records.
        // Also record the new index of the old group.
        while (i0 < k0) {
          groups[reIndex[i0] = k] = oldGroups[i0++];
          groupIncrement();
        }

        // If we added any new groups before any old groups,
        // update the group index of all the old records.
        if (k > i0) for (i0 = 0; i0 < n0; ++i0) {
          groupIndex[i0] = reIndex[groupIndex[i0]];
        }

        // Modify the update and reset behavior based on the cardinality.
        // If the cardinality is less than or equal to one, then the groupIndex
        // is not needed. If the cardinality is zero, then there are no records
        // and therefore no groups to update or reset. Note that we also must
        // change the registered listener to point to the new method.
        j = filterListeners.indexOf(update);
        if (k > 1) {
          update = updateMany;
          reset = resetMany;
        } else {
          if (k === 1) {
            update = updateOne;
            reset = resetOne;
          } else {
            update = crossfilter_null;
            reset = crossfilter_null;
          }
          groupIndex = null;
        }
        filterListeners[j] = update;
        dimRemoveListeners.push(update);

        // Count the number of added groups,
        // and widen the group index as needed.
        function groupIncrement() {
          if (++k === groupCapacity) {
            reIndex = crossfilter_arrayWiden(reIndex, groupWidth <<= 1);
            groupIndex = crossfilter_arrayWiden(groupIndex, groupWidth);
            groupCapacity = crossfilter_capacity(groupWidth);
          }
        }
      }

      // Reduces the specified selected or deselected records.
      // This function is only used when the cardinality is greater than 1.
      function updateMany(filterOne, added, removed, reset, forceRemove) {
        var i, ii,
            k,
            n, nn,
            g;
        if(forceRemove && (filterOne === one)) { // this is triggered when we remove records from this crossfliter
             for (i = 0, n = removed.length; i < n; ++i) {
                k = removed[i];
                g = groups[groupIndex[k]];
                g.value = reduceRemove(g.value, data[k],k,pivotGroups);
                 for (ii = k, nn = groupIndex.length; ii < nn; ++ii) {
                    groupIndex[ii] = groupIndex[ii + 1]
                 } 
             }
            groupIndex = groupIndex.subarray(0, nn-n) 
            return
        }
        if (filterOne === one || (resetNeeded = resetNeeded || reset)) return;
        // Add the added values.
        for (i = 0, n = added.length; i < n; ++i) {
          if (!(filters[k = added[i]] & zero)) {
            g = groups[groupIndex[k]];
            g.value = reduceAdd(g.value, data[k],k, pivotGroups);
          }
        }
     
        // Remove the removed values.
        for (i = 0, n = removed.length; i < n; ++i) {
          if ((filters[k = removed[i]] & zero) === filterOne) {
            g = groups[groupIndex[k]];
            g.value = reduceRemove(g.value, data[k],k, pivotGroups);
            
          }
        }
      }

      // Reduces the specified selected or deselected records.
      // This function is only used when the cardinality is 1.
      function updateOne(filterOne, added, removed, reset) {
        if (filterOne === one || (resetNeeded = resetNeeded || reset)) return;

        var i,
            k,
            n,
            g = groups[0];

        // Add the added values.
        for (i = 0, n = added.length; i < n; ++i) {
          if (!(filters[k = added[i]] & zero)) {
            g.value = reduceAdd(g.value, data[k],k, pivotGroups);
          }
        }

        // Remove the removed values.
        for (i = 0, n = removed.length; i < n; ++i) {
          if ((filters[k = removed[i]] & zero) === filterOne) {
            g.value = reduceRemove(g.value, data[k],k, pivotGroups);
          }
        }
      }

      // Recomputes the group reduce values from scratch.
      // This function is only used when the cardinality is greater than 1.
      function resetMany() {
        var i,
            g;

        // Reset all group values.
        for (i = 0; i < k; ++i) {
          groups[i].value = reduceInitial(pivotGroups);
        }

        // Add any selected records.
        for (i = 0; i < n; ++i) {
          if (!(filters[i] & zero)) {
            g = groups[groupIndex[i]];
            g.value = reduceAdd(g.value, data[i],i, pivotGroups);
          }
        }
      }

      // Recomputes the group reduce values from scratch.
      // This function is only used when the cardinality is 1.
      function resetOne() {
        var i,
            g = groups[0];

        // Reset the singleton group values.
        g.value = reduceInitial(pivotGroups);

        // Add any selected records.
        for (i = 0; i < n; ++i) {
          if (!(filters[i] & zero)) {
            g.value = reduceAdd(g.value, data[i], i, pivotGroups);
          }
        }
      }

      // Returns the array of group values, in the dimension's natural order.
      function all() {
        if (resetNeeded) reset(), resetNeeded = false;
        return groups;
      }

      // Returns a new array containing the top K group values, in reduce order.
      function top(k) {
        var top = select(all(), 0, groups.length, k);
        return heap.sort(top, 0, top.length);
      }

      // Sets the reduce behavior for this group to use the specified functions.
      // This method lazily recomputes the reduce values, waiting until needed.
      function reduce(add, remove, initial) {
        reduceAdd = add;
        reduceRemove = remove;
        reduceInitial = initial;
        resetNeeded = true;
        return group;
      }

      // A convenience method for reducing by count.
      function reduceCount() {
        return reduce(crossfilter_reduceIncrement, crossfilter_reduceDecrement, crossfilter_zero);
      }

      // A convenience method for reducing by sum(value).
      function reduceSum(value) {
        return reduce(crossfilter_reduceAdd(value), crossfilter_reduceSubtract(value), crossfilter_zero);
      }

      // Sets the reduce order, using the specified accessor.
      function order(value) {
        select = heapselect_by(valueOf);
        heap = heap_by(valueOf);
        function valueOf(d) { return value(d.value); }
        return group;
      }

      // A convenience method for natural ordering by reduce value.
      function orderNatural() {
        return order(crossfilter_identity);
      }

      // Returns the cardinality of this group, irrespective of any filters.
      function size() {
        return k;
      }

      return reduceCount().orderNatural();
    }

    // A convenience function for generating a singleton group.
    function groupAll() {
      var g = group(crossfilter_null), all = g.all;
      delete g.all;
      delete g.top;
      delete g.order;
      delete g.orderNatural;
      delete g.size;
      g.value = function() { return all()[0].value; };
      return g;
    }

        // Remove this dimension.
    function remove() {
      filterAll();
      var before = position ? -1 >>> 32 - position : 0, // mask for positions before this one
          after = -1 << position, // mask for positions after this one
          x,
          removed = [];
      for (var i = 0; i < n; i++) {
        filters[i] = (x = filters[i]) & before | x >>> 1 & after;
        removed[i] = i;
      }
      filterListeners.forEach(function(l) { l(one, [], removed); });
      positions.splice(position, 1);
      positions.slice(position).forEach(function(setPosition, i) {
        setPosition(position + i);
      });
      removeListeners.forEach(function(l) {
        var i = dataListeners.indexOf(l);
        if (i >= 0) dataListeners.splice(i, 1);
        i = filterListeners.indexOf(l);
        if (i >= 0) filterListeners.splice(i, 1);
      });
      m--;
      return dimension;
    }
   
   positions.push(function(i) {
      one = 1 << (position = i);
      zero = ~one;
    }); 
    
    return dimension;
  }



  // A convenience method for groupAll on a dummy dimension.
  // This implementation can be optimized since it is always cardinality 1.
  function groupAll() {
    var group = {
      reduce: reduce,
      reduceCount: reduceCount,
      reduceSum: reduceSum,
      value: value
    };

    var reduceValue,
        reduceAdd,
        reduceRemove,
        reduceInitial,
        resetNeeded = true;

    // The group listens to the crossfilter for when any dimension changes, so
    // that it can update the reduce value. It must also listen to the parent
    // dimension for when data is added.
    filterListeners.push(update);
    dataListeners.push(add);

    // For consistency; actually a no-op since resetNeeded is true.
    add(data, 0, n);

    // Incorporates the specified new values into this group.
    function add(newData, n0, n1) {
      var i;

      if (resetNeeded) return;

      // Add the added values.
      for (i = n0; i < n; ++i) {
        if (!filters[i]) {
          reduceValue = reduceAdd(reduceValue, data[i]);
        }
      }
    }

    // Reduces the specified selected or deselected records.
    function update(filterOne, added, removed, reset, forceRemove) {
      var i,
          k,
          n;
  //    if(toRemoveIndex) {removed = toRemoveIndex}  
      if (resetNeeded = resetNeeded || reset) return;

      // Add the added values.
      for (i = 0, n = added.length; i < n; ++i) {
        if (!filters[k = added[i]]) {
          reduceValue = reduceAdd(reduceValue, data[k],k);
        }
      }
    if(forceRemove  && (filterOne == 1)) {  // this is triggered when we remove records from this crossfliter
         for (i = 0, n = removed.length; i < n; ++i) {
            reduceValue = reduceRemove(reduceValue, data[ removed[i]],removed[i] );
         }
        return
    }
      // Remove the removed values.
      for (i = 0, n = removed.length; i < n; ++i) {
        if (filters[k = removed[i]] === filterOne) {
          reduceValue = reduceRemove(reduceValue, data[k], k);
        }
      }
    }

    // Recomputes the group reduce value from scratch.
    function reset() {
      var i;

      reduceValue = reduceInitial();

      for (i = 0; i < n; ++i) {
        if (!filters[i]) {
          reduceValue = reduceAdd(reduceValue, data[i], i);
        }
      }
    }

    // Sets the reduce behavior for this group to use the specified functions.
    // This method lazily recomputes the reduce value, waiting until needed.
    function reduce(add, remove, initial) {
      reduceAdd = add;
      reduceRemove = remove;
      reduceInitial = initial;
      resetNeeded = true;
      return group;
    }

    // A convenience method for reducing by count.
    function reduceCount() {
      return reduce(crossfilter_reduceIncrement, crossfilter_reduceDecrement, crossfilter_zero);
    }

    // A convenience method for reducing by sum(value).
    function reduceSum(value) {
      return reduce(crossfilter_reduceAdd(value), crossfilter_reduceSubtract(value), crossfilter_zero);
    }

    // Returns the computed reduce value.
    function value() {
      if (resetNeeded) reset(), resetNeeded = false;
      return reduceValue;
    }

    return reduceCount();
  }

  // Returns the number of records in this crossfilter, irrespective of any filters.
  function size() {
    return n;
  }

  return arguments.length
      ? add(arguments[0])
      : crossfilter;
}

// Returns an array of size n, big enough to store ids up to m.
function crossfilter_index(n, m) {
  return (m < 0x101
      ? crossfilter_array8 : m < 0x10001
      ? crossfilter_array16
      : crossfilter_array32)(n);
}

// Constructs a new array of size n, with sequential values from 0 to n - 1.
function crossfilter_range(n) {
  var range = crossfilter_index(n, n);
  for (var i = -1; ++i < n;) range[i] = i;
  return range;
}

function crossfilter_capacity(w) {
  return w === 8
      ? 0x100 : w === 16
      ? 0x10000
      : 0x100000000;
}