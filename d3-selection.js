if (!this.Map) {
  Map = function() {};
  Map.prototype = {
    set: function(k, v) { this["$" + k] = v; return this; },
    get: function(k) { return this["$" + k]; },
    has: function(k) { return "$" + k in this; }
  };
}

(function(global) {
  "use strict";

  var sourceEvent = function() {
    var event = global.d3.event, source;
    while (source = event.sourceEvent) event = source;
    return event;
  };

  var selectorOf = function(selector) {
    return function() {
      return this.querySelector(selector);
    };
  };

  var selection_select = function(selector) {
    var depth = this._depth,
        stack = new Array(depth * 2);

    if (typeof selector !== "function") selector = selectorOf(selector);

    function visit(nodes, update, depth) {
      var i = -1,
          n = nodes.length,
          node,
          subnode,
          subnodes = new Array(n);

      if (--depth) {
        var stack0 = depth * 2,
            stack1 = stack0 + 1;
        while (++i < n) {
          if (node = nodes[i]) {
            stack[stack0] = node._parent.__data__, stack[stack1] = i;
            subnodes[i] = visit(node, update && update[i], depth);
          }
        }
      }

      // The leaf group may be sparse if the selector returns a falsey value;
      // this preserves the index of nodes (unlike selection.filter).
      // Propagate data to the new node only if it is defined on the old.
      // If this is an enter selection, materialized nodes are moved to update.
      else {
        while (++i < n) {
          if (node = nodes[i]) {
            stack[0] = node.__data__, stack[1] = i;
            if (subnode = selector.apply(node, stack)) {
              if ("__data__" in node) subnode.__data__ = node.__data__;
              if (update) update[i] = subnode, delete nodes[i];
              subnodes[i] = subnode;
            }
          }
        }
      }

      subnodes._parent = nodes._parent;
      return subnodes;
    }

    return new Selection(visit(this._root, this._update && this._update._root, depth), depth);
  };

  var selection_selectAll = function(selector) {
    var depth = this._depth,
        stack = new Array(depth * 2);

    if (typeof selector !== "function") selector = selectorAllOf(selector);

    function visit(nodes, depth) {
      var i = -1,
          n = nodes.length,
          node,
          subnode,
          subnodes = new Array(n);

      if (--depth) {
        var stack0 = depth * 2,
            stack1 = stack0 + 1;
        while (++i < n) {
          if (node = nodes[i]) {
            stack[stack0] = node._parent.__data__, stack[stack1] = i;
            subnodes[i] = visit(node, depth);
          }
        }
      }

      // Data is not propagated since there is a one-to-many mapping.
      // The parent of the new leaf group is the old node.
      else {
        while (++i < n) {
          if (node = nodes[i]) {
            stack[0] = node.__data__, stack[1] = i;
            subnodes[i] = subnode = selector.apply(node, stack);
            subnode._parent = node;
          }
        }
      }

      subnodes._parent = nodes._parent;
      return subnodes;
    }

    return new Selection(visit(this._root, depth), depth + 1);
  };

  function selectorAllOf(selector) {
    return function() {
      return this.querySelectorAll(selector);
    };
  }

  var selection_filter = function(filter) {
    var depth = this._depth,
        stack = new Array(depth * 2);

    if (typeof filter !== "function") filter = filterOf(filter);

    function visit(nodes, depth) {
      var i = -1,
          n = nodes.length,
          node,
          subnodes;

      if (--depth) {
        var stack0 = depth * 2,
            stack1 = stack0 + 1;
        subnodes = new Array(n);
        while (++i < n) {
          if (node = nodes[i]) {
            stack[stack0] = node._parent.__data__, stack[stack1] = i;
            subnodes[i] = visit(node, depth);
          }
        }
      }

      // The filter operation does not preserve the original index,
      // so the resulting leaf groups are dense (not sparse).
      else {
        subnodes = [];
        while (++i < n) {
          if (node = nodes[i]) {
            stack[0] = node.__data__, stack[1] = i;
            if (filter.apply(node, stack)) {
              subnodes.push(node);
            }
          }
        }
      }

      subnodes._parent = nodes._parent;
      return subnodes;
    }

    return new Selection(visit(this._root, depth), depth);
  };

  var filterOf = function(selector) {
    return function() {
      return this.matches(selector);
    };
  };

  if (global.document) {
    var selection_filter__element = document.documentElement;
    if (!selection_filter__element.matches) {
      var vendorMatches = selection_filter__element.webkitMatchesSelector || selection_filter__element.msMatchesSelector || selection_filter__element.mozMatchesSelector || selection_filter__element.oMatchesSelector;
      filterOf = function(selector) { return function() { return vendorMatches.call(this, selector); }; };
    }
  }

  // The value may either be an array or a function that returns an array.
  // An optional key function may be specified to control how data is bound;
  // if no key function is specified, data is bound to nodes by index.
  // Or, if no arguments are specified, this method returns all bound data.
  var selection_data = function(value, key) {
    if (!value) {
      var data = new Array(this.size()), i = -1;
      this.each(function(d) { data[++i] = d; });
      return data;
    }

    var depth = this._depth - 1,
        stack = new Array(depth * 2),
        bind = key ? bindKey : bindIndex;

    if (typeof value !== "function") value = valueOf(value);
    visit(this._root, this.enter()._root, this.exit()._root, depth);

    function visit(update, enter, exit, depth) {
      var i = -1,
          n,
          node;

      if (depth--) {
        var stack0 = depth * 2,
            stack1 = stack0 + 1;

        n = update.length;

        while (++i < n) {
          if (node = update[i]) {
            stack[stack0] = node._parent.__data__, stack[stack1] = i;
            visit(node, enter[i], exit[i], depth);
          }
        }
      }

      else {
        var j = 0,
            before;

        bind(update, enter, exit, value.apply(update._parent, stack));
        n = update.length;

        // Now connect the enter nodes to their following update node, such that
        // appendChild can insert the materialized enter node before this node,
        // rather than at the end of the parent node.
        while (++i < n) {
          if (before = enter[i]) {
            if (i >= j) j = i + 1;
            while (!(node = update[j]) && ++j < n);
            before._next = node || null;
          }
        }
      }
    }

    function bindIndex(update, enter, exit, data) {
      var i = 0,
          node,
          nodeLength = update.length,
          dataLength = data.length,
          minLength = Math.min(nodeLength, dataLength);

      // Clear the enter and exit arrays, and then initialize to the new length.
      enter.length = 0, enter.length = dataLength;
      exit.length = 0, exit.length = nodeLength;

      for (; i < minLength; ++i) {
        if (node = update[i]) {
          node.__data__ = data[i];
        } else {
          enter[i] = new EnterNode(update._parent, data[i]);
        }
      }

      // Note: we don’t need to delete update[i] here because this loop only
      // runs when the data length is greater than the node length.
      for (; i < dataLength; ++i) {
        enter[i] = new EnterNode(update._parent, data[i]);
      }

      // Note: and, we don’t need to delete update[i] here because immediately
      // following this loop we set the update length to data length.
      for (; i < nodeLength; ++i) {
        if (node = update[i]) {
          exit[i] = update[i];
        }
      }

      update.length = dataLength;
    }

    function bindKey(update, enter, exit, data) {
      var i,
          node,
          dataLength = data.length,
          nodeLength = update.length,
          nodeByKeyValue = new Map,
          keyStack = [null, null].concat(stack),
          keyValues = new Array(nodeLength),
          keyValue;

      // Clear the enter and exit arrays, and then initialize to the new length.
      enter.length = 0, enter.length = dataLength;
      exit.length = 0, exit.length = nodeLength;

      // Compute the keys for each node.
      for (i = 0; i < nodeLength; ++i) {
        if (node = update[i]) {
          keyStack[0] = node.__data__, keyStack[1] = i;
          keyValues[i] = keyValue = key.apply(node, keyStack);

          // Is this a duplicate of a key we’ve previously seen?
          // If so, this node is moved to the exit selection.
          if (nodeByKeyValue.has(keyValue)) {
            exit[i] = node;
          }

          // Otherwise, record the mapping from key to node.
          else {
            nodeByKeyValue.set(keyValue, node);
          }
        }
      }

      // Now clear the update array and initialize to the new length.
      update.length = 0, update.length = dataLength;

      // Compute the keys for each datum.
      for (i = 0; i < dataLength; ++i) {
        keyStack[0] = data[i], keyStack[1] = i;
        keyValue = key.apply(update._parent, keyStack);

        // Is there a node associated with this key?
        // If not, this datum is added to the enter selection.
        if (!(node = nodeByKeyValue.get(keyValue))) {
          enter[i] = new EnterNode(update._parent, data[i]);
        }

        // Did we already bind a node using this key? (Or is a duplicate?)
        // If unique, the node and datum are joined in the update selection.
        // Otherwise, the datum is ignored, neither entering nor exiting.
        else if (node !== true) {
          update[i] = node;
          node.__data__ = data[i];
        }

        // Record that we consumed this key, either to enter or update.
        nodeByKeyValue.set(keyValue, true);
      }

      // Take any remaining nodes that were not bound to data,
      // and place them in the exit selection.
      for (i = 0; i < nodeLength; ++i) {
        if ((node = nodeByKeyValue.get(keyValues[i])) !== true) {
          exit[i] = node;
        }
      }
    }

    return this;
  };

  function EnterNode(parent, datum) {
    this.ownerDocument = parent.ownerDocument;
    this.namespaceURI = parent.namespaceURI;
    this._next = null;
    this._parent = parent;
    this.__data__ = datum;
  }

  EnterNode.prototype = {
    appendChild: function(child) { return this._parent.insertBefore(child, this._next); },
    insertBefore: function(child, next) { return this._parent.insertBefore(child, next || this._next); }
  };

  function valueOf(value) {
    return function() {
      return value;
    };
  }

  // The leaf groups of the selection hierarchy are initially NodeList,
  // and then lazily converted to arrays when mutation is required.
  var arrayify = function(selection) {
    return selection._root = arrayifyNode(selection._root, selection._depth);
  };

  function arrayifyNode(nodes, depth) {
    var i = -1,
        n = nodes.length,
        node;

    if (--depth) {
      while (++i < n) {
        if (node = nodes[i]) {
          nodes[i] = arrayifyNode(node, depth);
        }
      }
    }

    else if (!Array.isArray(nodes)) {
      var array = new Array(n);
      while (++i < n) array[i] = nodes[i];
      array._parent = nodes._parent;
      nodes = array;
    }

    return nodes;
  }

  var emptyOf = function(selection) {
    return new Selection(emptyNode(arrayify(selection), selection._depth), selection._depth);
  };

  function emptyNode(nodes, depth) {
    var i = -1,
        n = nodes.length,
        node,
        empty = new Array(n);

    if (--depth) {
      while (++i < n) {
        if (node = nodes[i]) {
          empty[i] = emptyNode(node, depth);
        }
      }
    }

    empty._parent = nodes._parent;
    return empty;
  }

  var selection_enter = function() {
    if (!this._enter) {
      this._enter = emptyOf(this);
      this._enter._update = this;
    }
    return this._enter;
  };

  var selection_exit = function() {
    return this._exit || (this._exit = emptyOf(this));
  };

  var selection_order = function() {
    orderNode(this._root, this._depth);
    return this;
  };

  function orderNode(nodes, depth) {
    var i = nodes.length,
        node,
        next;

    if (--depth) {
      while (--i >= 0) {
        if (node = nodes[i]) {
          orderNode(node, depth);
        }
      }
    }

    else {
      next = nodes[--i];
      while (--i >= 0) {
        if (node = nodes[i]) {
          if (next && next !== node.nextSibling) next.parentNode.insertBefore(node, next);
          next = node;
        }
      }
    }
  }

  var selection_sort = function(comparator) {
    if (!comparator) comparator = ascending;

    function compare(a, b) {
      return a && b ? comparator(a.__data__, b.__data__) : !a - !b;
    }

    function visit(nodes, depth) {
      if (--depth) {
        var i = -1,
            n = nodes.length,
            node;
        while (++i < n) {
          if (node = nodes[i]) {
            visit(node, depth);
          }
        }
      }

      else {
        nodes.sort(compare);
      }
    }

    visit(arrayify(this), this._depth);
    return this.order();
  };

  function ascending(a, b) {
    return a < b ? -1 : a > b ? 1 : a >= b ? 0 : NaN;
  }

  var selection_call = function() {
    var callback = arguments[0];
    callback.apply(arguments[0] = this, arguments);
    return this;
  };

  var selection_nodes = function() {
    var nodes = new Array(this.size()), i = -1;
    this.each(function() { nodes[++i] = this; });
    return nodes;
  };

  var selection_node = function() {
    return firstNode(this._root, this._depth);
  };

  function firstNode(nodes, depth) {
    var i = -1,
        n = nodes.length,
        node;

    if (--depth) {
      while (++i < n) {
        if (node = nodes[i]) {
          if (node = firstNode(node, depth)) {
            return node;
          }
        }
      }
    }

    else {
      while (++i < n) {
        if (node = nodes[i]) {
          return node;
        }
      }
    }
  }

  var selection_size = function() {
    var size = 0;
    this.each(function() { ++size; });
    return size;
  };

  var selection_empty = function() {
    return !this.node();
  };

  var selection_each = function(callback) {
    var depth = this._depth,
        stack = new Array(depth);

    function visit(nodes, depth) {
      var i = -1,
          n = nodes.length,
          node;

      if (--depth) {
        var stack0 = depth * 2,
            stack1 = stack0 + 1;
        while (++i < n) {
          if (node = nodes[i]) {
            stack[stack0] = node._parent.__data__, stack[stack1] = i;
            visit(node, depth);
          }
        }
      }

      else {
        while (++i < n) {
          if (node = nodes[i]) {
            stack[0] = node.__data__, stack[1] = i;
            callback.apply(node, stack);
          }
        }
      }
    }

    visit(this._root, depth);
    return this;
  };

  var namespaces = (new Map)
      .set("svg", "http://www.w3.org/2000/svg")
      .set("xhtml", "http://www.w3.org/1999/xhtml")
      .set("xlink", "http://www.w3.org/1999/xlink")
      .set("xml", "http://www.w3.org/XML/1998/namespace")
      .set("xmlns", "http://www.w3.org/2000/xmlns/");

  var namespace = function(name) {
    var i = name.indexOf(":"), prefix = name;
    if (i >= 0) prefix = name.slice(0, i), name = name.slice(i + 1);
    return namespaces.has(prefix) ? {space: namespaces.get(prefix), local: name} : name;
  };

  var selection_attr = function(name, value) {
    name = namespace(name);

    if (arguments.length < 2) {
      var node = this.node();
      return name.local
          ? node.getAttributeNS(name.space, name.local)
          : node.getAttribute(name);
    }

    function remove() {
      this.removeAttribute(name);
    }

    function removeNS() {
      this.removeAttributeNS(name.space, name.local);
    }

    function setConstant() {
      this.setAttribute(name, value);
    }

    function setConstantNS() {
      this.setAttributeNS(name.space, name.local, value);
    }

    function setFunction() {
      var x = value.apply(this, arguments);
      if (x == null) this.removeAttribute(name);
      else this.setAttribute(name, x);
    }

    function setFunctionNS() {
      var x = value.apply(this, arguments);
      if (x == null) this.removeAttributeNS(name.space, name.local);
      else this.setAttributeNS(name.space, name.local, x);
    }

    return this.each(value == null
        ? (name.local ? removeNS : remove)
        : (typeof value === "function"
            ? (name.local ? setFunctionNS : setFunction)
            : (name.local ? setConstantNS : setConstant)));
  };

  var defaultView = function(node) {
    return node
        && ((node.ownerDocument && node.ownerDocument.defaultView) // node is a Node
            || (node.document && node) // node is a Window
            || node.defaultView); // node is a Document
  };

  var selection_style = function(name, value, priority) {
    var n = arguments.length;

    if (n < 2) return defaultView(n = this.node()).getComputedStyle(n, null).getPropertyValue(name);

    if (n < 3) priority = "";

    function remove() {
      this.style.removeProperty(name);
    }

    function setConstant() {
      this.style.setProperty(name, value, priority);
    }

    function setFunction() {
      var x = value.apply(this, arguments);
      if (x == null) this.style.removeProperty(name);
      else this.style.setProperty(name, x, priority);
    }

    return this.each(value == null ? remove : typeof value === "function" ? setFunction : setConstant);
  };

  var selection_property = function(name, value) {
    if (arguments.length < 2) return this.node()[name];

    function remove() {
      delete this[name];
    }

    function setConstant() {
      this[name] = value;
    }

    function setFunction() {
      var x = value.apply(this, arguments);
      if (x == null) delete this[name];
      else this[name] = x;
    }

    return this.each(value == null ? remove : typeof value === "function" ? setFunction : setConstant);
  };

  var requoteRe = /[\\\^\$\*\+\?\|\[\]\(\)\.\{\}]/g;

  var requote = function(string) {
    return string.replace(requoteRe, "\\$&");
  };

  var selection_class = function(name, value) {
    name = (name + "").trim().split(/^|\s+/);
    var n = name.length;

    if (arguments.length < 2) {
      var node = this.node(), i = -1;
      if (value = node.classList) { // SVG elements may not support DOMTokenList!
        while (++i < n) if (!value.contains(name[i])) return false;
      } else {
        value = node.getAttribute("class");
        while (++i < n) if (!classedRe(name[i]).test(value)) return false;
      }
      return true;
    }

    name = name.map(classerOf);

    function setConstant() {
      var i = -1;
      while (++i < n) name[i](this, value);
    }

    function setFunction() {
      var i = -1, x = value.apply(this, arguments);
      while (++i < n) name[i](this, x);
    }

    return this.each(typeof value === "function" ? setFunction : setConstant);
  };

  function classerOf(name) {
    var re;
    return function(node, value) {
      if (c = node.classList) return value ? c.add(name) : c.remove(name);
      if (!re) re = new RegExp("(?:^|\\s+)" + requote(name) + "(?:\\s+|$)", "g");
      var c = node.getAttribute("class") || "";
      if (value) {
        re.lastIndex = 0;
        if (!re.test(c)) node.setAttribute("class", collapse(c + " " + name));
      } else {
        node.setAttribute("class", collapse(c.replace(re, " ")));
      }
    };
  }

  function collapse(string) {
    return string.trim().replace(/\s+/g, " ");
  }

  var selection_text = function(value) {
    if (!arguments.length) return this.node().textContent;

    function setConstant() {
      this.textContent = value;
    }

    function setFunction() {
      var v = value.apply(this, arguments);
      this.textContent = v == null ? "" : v;
    }

    if (value == null) value = "";

    return this.each(typeof value === "function" ? setFunction : setConstant);
  };

  var selection_html = function(value) {
    if (!arguments.length) return this.node().innerHTML;

    function setConstant() {
      this.innerHTML = value;
    }

    function setFunction() {
      var v = value.apply(this, arguments);
      this.innerHTML = v == null ? "" : v;
    }

    if (value == null) value = "";

    return this.each(typeof value === "function" ? setFunction : setConstant);
  };

  var selection_append = function(creator, selector) {
    if (typeof creator !== "function") creator = creatorOf(creator);

    function append() {
      return this.appendChild(creator.apply(this, arguments));
    }

    function insert() {
      return this.insertBefore(creator.apply(this, arguments), selector.apply(this, arguments) || null);
    }

    return this.select(arguments.length < 2
        ? append
        : (typeof selector !== "function" && (selector = selectorOf(selector)), insert));
  };

  function creatorOf(name) {
    name = namespace(name);

    function creator() {
      var document = this.ownerDocument,
          uri = this.namespaceURI;
      return uri
          ? document.createElementNS(uri, name)
          : document.createElement(name);
    }

    function creatorNS() {
      return this.ownerDocument.createElementNS(name.space, name.local);
    }

    return name.local ? creatorNS : creator;
  }

  var selection_remove = function() {
    return this.each(function() {
      var parent = this.parentNode;
      if (parent) parent.removeChild(this);
    });
  };

  var selection_datum = function(value) {
    return arguments.length ? this.property("__data__", value) : this.node().__data__;
  };

  var filterEvents = new Map;

  if (global.document) {
    var selection_event__element = document.documentElement;
    if (!("onmouseenter" in selection_event__element)) {
      filterEvents.set("mouseenter", "mouseover").set("mouseleave", "mouseout");
    }
  }

  var selection_event = function(type, listener, capture) {
    var n = arguments.length,
        key = "__on" + type,
        filter,
        root = this._root;

    if (n < 2) return (n = this.node()[key]) && n._listener;

    if (n < 3) capture = false;
    if ((n = type.indexOf(".")) > 0) type = type.slice(0, n);
    if (filter = filterEvents.has(type)) type = filterEvents.get(type);

    function add() {
      var ancestor = root, i = arguments.length >> 1, ancestors = new Array(i);
      while (--i >= 0) ancestor = ancestor[arguments[(i << 1) + 1]], ancestors[i] = i ? ancestor._parent : ancestor;
      var l = listenerOf(listener, ancestors, arguments);
      if (filter) l = filterListenerOf(l);
      remove.call(this);
      this.addEventListener(type, this[key] = l, l._capture = capture);
      l._listener = listener;
    }

    function remove() {
      var l = this[key];
      if (l) {
        this.removeEventListener(type, l, l._capture);
        delete this[key];
      }
    }

    function removeAll() {
      var re = new RegExp("^__on([^.]+)" + requote(type) + "$"), match;
      for (var name in this) {
        if (match = name.match(re)) {
          var l = this[name];
          this.removeEventListener(match[1], l, l._capture);
          delete this[name];
        }
      }
    }

    return this.each(listener
        ? (n ? add : noop) // Attempt to add untyped listener is ignored.
        : (n ? remove : removeAll));
  };

  function listenerOf(listener, ancestors, args) {
    return function(event) {
      var i = ancestors.length, event0 = global.d3.event; // Events can be reentrant (e.g., focus).
      while (--i >= 0) args[i << 1] = ancestors[i].__data__;
      global.d3.event = event;
      try {
        listener.apply(ancestors[0], args);
      } finally {
        global.d3.event = event0;
      }
    };
  }

  function filterListenerOf(listener) {
    return function(event) {
      var related = event.relatedTarget;
      if (!related || (related !== this && !(related.compareDocumentPosition(this) & 8))) {
        listener(event);
      }
    };
  }

  function noop() {}

  var selection_dispatch = function(type, params) {

    function dispatchConstant() {
      return dispatchEvent(this, type, params);
    }

    function dispatchFunction() {
      return dispatchEvent(this, type, params.apply(this, arguments));
    }

    return this.each(typeof params === "function" ? dispatchFunction : dispatchConstant);
  };

  function dispatchEvent(node, type, params) {
    var window = defaultView(node),
        event = window.CustomEvent;

    if (event) {
      event = new event(type, params);
    } else {
      event = window.document.createEvent("Event");
      if (params) event.initEvent(type, params.bubbles, params.cancelable), event.detail = params.detail;
      else event.initEvent(type, false, false);
    }

    node.dispatchEvent(event);
  }

  function Selection(root, depth) {
    this._root = root;
    this._depth = depth;
    this._enter = this._update = this._exit = null;
  }

  Selection.prototype = {
    select: selection_select,
    selectAll: selection_selectAll,
    filter: selection_filter,
    data: selection_data,
    enter: selection_enter,
    exit: selection_exit,
    order: selection_order,
    sort: selection_sort,
    call: selection_call,
    nodes: selection_nodes,
    node: selection_node,
    size: selection_size,
    empty: selection_empty,
    each: selection_each,
    attr: selection_attr,
    style: selection_style,
    property: selection_property,
    class: selection_class,
    classed: selection_class, // deprecated alias
    text: selection_text,
    html: selection_html,
    append: selection_append,
    insert: selection_append, // deprecated alias
    remove: selection_remove,
    datum: selection_datum,
    event: selection_event,
    on: selection_event, // deprecated alias
    dispatch: selection_dispatch
  };

  var select = function(selector) {
    var root;
    if (typeof selector === "string") {
      root = [document.querySelector(selector)];
      root._parent = document.documentElement;
    } else {
      root = [selector];
      root._parent = null;
    }
    return new Selection(root, 1);
  };

  var bug44083 = global.navigator && /WebKit/.test(global.navigator.userAgent) ? -1 : 0; // https://bugs.webkit.org/show_bug.cgi?id=44083

  var src_point = function(node, event) {
    var svg = node.ownerSVGElement || node;
    if (svg.createSVGPoint) {
      var point = svg.createSVGPoint();
      if (bug44083 < 0) {
        var window = defaultView(node);
        if (window.scrollX || window.scrollY) {
          svg = select(window.document.body).append("svg").style({position: "absolute", top: 0, left: 0, margin: 0, padding: 0, border: "none"}, "important");
          var ctm = svg.node().getScreenCTM();
          bug44083 = !(ctm.f || ctm.e);
          svg.remove();
        }
      }
      if (bug44083) point.x = event.pageX, point.y = event.pageY;
      else point.x = event.clientX, point.y = event.clientY;
      point = point.matrixTransform(node.getScreenCTM().inverse());
      return [point.x, point.y];
    }
    var rect = node.getBoundingClientRect();
    return [event.clientX - rect.left - node.clientLeft, event.clientY - rect.top - node.clientTop];
  };

  var mouse = function(node, event) {
    if (arguments.length < 2) event = sourceEvent();
    if (event.changedTouches) event = event.changedTouches[0];
    return src_point(node, event);
  };

  var selectAll = function(selector) {
    var root;
    if (typeof selector === "string") {
      root = document.querySelectorAll(selector);
      root._parent = document.documentElement;
    } else {
      root = selector;
      root._parent = null;
    }
    return new Selection(root, 1);
  };

  var src_touch = function(node, touches, identifier) {
    if (arguments.length < 3) identifier = touches, touches = sourceEvent().changedTouches;
    for (var i = 0, n = touches ? touches.length : 0, touch; i < n; ++i) {
      if ((touch = touches[i]).identifier === identifier) {
        return src_point(node, touch);
      }
    }
    return null;
  };

  var src_touches = function(node, touches) {
    if (arguments.length < 2) touches = sourceEvent().touches;
    for (var i = 0, n = touches ? touches.length : 0, points = new Array(n); i < n; ++i) {
      points[i] = src_point(node, touches[i]);
    }
    return points;
  };

  var index = {
    mouse: mouse,
    namespace: namespace,
    namespaces: namespaces,
    requote: requote,
    select: select,
    selectAll: selectAll,
    selection: Selection,
    touch: src_touch,
    touches: src_touches
  };

  var d3 = global.d3;
  if (d3) for (var field in index) d3[field] = index[field];
  else global.d3 = d3 = index;
  if (typeof define === "function" && define.amd) define(d3);
  else if (typeof module === "object" && module.exports) module.exports = d3;
})(this);
