/*!
 * VERSION: 1.0.0
 *
 * Original Work: GreenSock. (Jack Doyle, jack@greensock.com)
 * Updated work: Anton Lavrenov
 * GSAP 3 compatibility update
 * This work is subject to the terms at http://greensock.com/standard-license or for
 * Club GreenSock members, the software agreement that was issued with your membership.
 *
 */

import gsap from "gsap";

(function () {
  "use strict";

  if (!gsap) {
    console.warn(
      "GSAP not found. Make sure to load GSAP before the KonvaPlugin."
    );
    return;
  }

  var _specialProps = {
      scale: 1,
      shadowOffset: 1,
      fillPatternOffset: 1,
      offset: 1,
      fill: 2,
      stroke: 2,
      shadowColor: 2,
    }, //type 1 is one that has "x" and "y" components that can be split apart but in order to set them, they must be combined into a single object and passed to one setter (like setScale({x:0.5, y:0.6})). Type 2 is for colors.
    _getterFuncs = {},
    _setterFuncs = {},
    _numExp = /(\d|\.)+/g,
    _directionalRotationExp = /(?:_cw|_ccw|_short)/,
    _colorLookup = {
      aqua: [0, 255, 255],
      lime: [0, 255, 0],
      silver: [192, 192, 192],
      black: [0, 0, 0],
      maroon: [128, 0, 0],
      teal: [0, 128, 128],
      blue: [0, 0, 255],
      navy: [0, 0, 128],
      white: [255, 255, 255],
      fuchsia: [255, 0, 255],
      olive: [128, 128, 0],
      yellow: [255, 255, 0],
      orange: [255, 165, 0],
      gray: [128, 128, 128],
      purple: [128, 0, 128],
      green: [0, 128, 0],
      red: [255, 0, 0],
      pink: [255, 192, 203],
      cyan: [0, 255, 255],
      transparent: [255, 255, 255, 0],
    },
    _hue = function (h, m1, m2) {
      h = h < 0 ? h + 1 : h > 1 ? h - 1 : h;
      return (
        ((h * 6 < 1
          ? m1 + (m2 - m1) * h * 6
          : h < 0.5
          ? m2
          : h * 3 < 2
          ? m1 + (m2 - m1) * (2 / 3 - h) * 6
          : m1) *
          255 +
          0.5) |
        0
      );
    },
    _parseColor = function (color) {
      if (color === "" || color == null || color === "none") {
        return _colorLookup.transparent;
      }
      if (_colorLookup[color]) {
        return _colorLookup[color];
      }
      if (typeof color === "number") {
        return [color >> 16, (color >> 8) & 255, color & 255];
      }
      if (color.charAt(0) === "#") {
        if (color.length === 4) {
          //for shorthand like #9F0
          color =
            "#" +
            color.charAt(1) +
            color.charAt(1) +
            color.charAt(2) +
            color.charAt(2) +
            color.charAt(3) +
            color.charAt(3);
        }
        color = parseInt(color.substr(1), 16);
        return [color >> 16, (color >> 8) & 255, color & 255];
      }
      if (color.substr(0, 3) === "hsl") {
        color = color.match(_numExp);
        var h = (Number(color[0]) % 360) / 360,
          s = Number(color[1]) / 100,
          l = Number(color[2]) / 100,
          m2 = l <= 0.5 ? l * (s + 1) : l + s - l * s,
          m1 = l * 2 - m2;
        if (color.length > 3) {
          color[3] = Number(color[3]);
        }
        color[0] = _hue(h + 1 / 3, m1, m2);
        color[1] = _hue(h, m1, m2);
        color[2] = _hue(h - 1 / 3, m1, m2);
        return color;
      }
      var a = color.match(_numExp) || _colorLookup.transparent,
        i = a.length;
      while (--i > -1) {
        a[i] = Number(a[i]);
      }
      return a;
    },
    ColorProp = function (target, getter, setter, next) {
      this.getter = getter;
      this.setter = setter;
      var val = _parseColor(target[getter]());
      this.proxy = {
        r: val[0],
        g: val[1],
        b: val[2],
        a: val.length > 3 ? val[3] : 1,
      };
      if (next) {
        this._next = next;
        next._prev = this;
      }
    },
    _layersToDraw = [],
    _ticker,
    _listening,
    _onTick = function () {
      var i = _layersToDraw.length;
      if (i !== 0) {
        while (--i > -1) {
          if (_layersToDraw[i] && _layersToDraw[i].draw) {
            _layersToDraw[i].draw();
            _layersToDraw[i]._gsDraw = false;
          }
        }
        _layersToDraw.length = 0;
      } else {
        gsap.ticker.remove(_onTick);
        _listening = false;
      }
    },
    _prepDimensionProp = function (p, dimension) {
      var alt = dimension === "x" ? "y" : "x",
        proxyName = "_gs_" + p;
      _getterFuncs[p] = function () {
        return this["get" + p]()[dimension];
      };
      _setterFuncs[p] = function (value) {
        var cur = this["get" + p](),
          proxy = this[proxyName];
        if (!proxy) {
          proxy = this[proxyName] = {};
        }
        proxy[dimension] = value;
        proxy[alt] = cur[alt];
        this[p](proxy);
        return this;
      };
    },
    _createGetterSetter = function (getter, setter) {
      return function (value) {
        return arguments.length ? setter(value) : getter();
      };
    },
    //looks at every property in the vars and converts them (when appropriate) to the KonvaJS equivalent. If it finds a special property for which "x" and "y" must be split apart (like scale, offset, shadowOffset, etc.), it will do that as well. This method returns an array of any names it had to change (like "x", "y", "scale", etc.) so that they can be used in the overwriteProps array.
    _convertProps = function (target, vars) {
      var converted = [],
        p,
        val,
        i,
        proto;
      for (p in vars) {
        val = vars[p];
        if (
          p !== "bezier" &&
          p !== "autoDraw" &&
          p.substr(0, 3) !== "set" &&
          target[p] === undefined
        ) {
          converted.push(p);
          delete vars[p];
          p = "set" + p.charAt(0).toUpperCase() + p.substr(1);
          vars[p] = val;
        }
        if (_specialProps[p]) {
          if (_specialProps[p] === 1) {
            vars[p + "X"] = vars[p + "Y"] = vars[p];
            delete vars[p];
            return _convertProps(target, vars);
          } else if (!target[p] && _setterFuncs[p]) {
            proto = target.prototype || target;
            proto[p] = _createGetterSetter(_getterFuncs[p], _setterFuncs[p]);
          }
        } else if (p === "bezier") {
          val = val instanceof Array ? val : val.values || [];
          i = val.length;
          while (--i > -1) {
            if (i === 0) {
              converted = converted.concat(_convertProps(target, val[i]));
            } else {
              _convertProps(target, val[i]);
            }
          }
        }
      }
      return converted;
    },
    _copy = function (obj) {
      var result = {},
        p;
      for (p in obj) {
        result[p] = obj[p];
      }
      return result;
    },
    p;

  for (p in _specialProps) {
    if (_specialProps[p] === 1) {
      _prepDimensionProp(p, "x");
      _prepDimensionProp(p, "y");
    }
  }

  // Helper function to create a setter function for Konva objects
  var _createSetter = function (target, prop) {
    if (typeof target[prop] === "function") {
      return function (value) {
        target[prop](value);
      };
    } else {
      return function (value) {
        target[prop] = value;
      };
    }
  };

  // Helper function to get current value from Konva object
  var _getCurrentValue = function (target, prop) {
    var gp = "get" + prop.substr(3);
    if (typeof target[prop] === "function") {
      if (gp !== "get" && typeof target[gp] === "function") {
        return target[gp]();
      } else {
        return target[prop]();
      }
    } else {
      return target[prop] || 0;
    }
  };

  // GSAP 3 Plugin Definition
  gsap.registerPlugin({
    name: "konva",
    init: function (target, vars, tween, index, targets) {
      this.target = target;
      this._props = _convertProps(target, vars);
      this._layer = vars.autoDraw !== false ? target.getLayer() : null;
      this._arrayTweens = null;
      this._arrayProps = null;
      this._firstSP = null;

      if (!_ticker && this._layer) {
        _ticker = gsap.ticker;
      }

      for (var p in vars) {
        var val = vars[p];

        //we must handle colors in a special way, splitting apart the red, green, blue, and alpha.
        if (_specialProps[p] === 2) {
          var sp = (this._firstSP = new ColorProp(target, p, p, this._firstSP));
          val = _parseColor(val);
          if (sp.proxy.r !== val[0]) {
            this.add(sp.proxy, "r", val[0]);
          }
          if (sp.proxy.g !== val[1]) {
            this.add(sp.proxy, "g", val[1]);
          }
          if (sp.proxy.b !== val[2]) {
            this.add(sp.proxy, "b", val[2]);
          }
          if ((val.length > 3 || sp.proxy.a !== 1) && sp.proxy.a !== val[3]) {
            this.add(sp.proxy, "a", val.length > 3 ? val[3] : 1);
          }
        } else if (p === "bezier") {
          // Handle bezier with MotionPathPlugin if available
          console.warn(
            "Bezier functionality should use MotionPathPlugin in GSAP 3"
          );
        } else if (
          (p === "rotation" || p === "rotationDeg") &&
          typeof val === "string" &&
          _directionalRotationExp.test(val)
        ) {
          // Handle directional rotation
          console.warn(
            "Directional rotation should use GSAP 3's built-in directional rotation"
          );
        } else if (val instanceof Array) {
          //for array-based values like "points"
          this._initArrayTween(target[p](), val, p);
        } else if (p !== "autoDraw") {
          var currentValue = _getCurrentValue(target, p);
          this.add(
            target,
            p,
            currentValue,
            val,
            0,
            0,
            0,
            0,
            0,
            _createSetter(target, p)
          );
        }
      }
    },

    render: function (progress, data) {
      var pt = data._pt,
        target = data.target,
        sp = data._firstSP,
        layer = data._layer,
        arrayTweens = data._arrayTweens,
        i,
        e,
        p,
        val,
        proxy;

      // Handle standard property tweens
      while (pt) {
        if (pt.set) {
          pt.set(pt.t, pt.p, pt.b + pt.c * progress, data);
        }
        pt = pt._next;
      }

      // Handle color properties
      if (sp) {
        while (sp) {
          proxy = sp.proxy;
          target[sp.setter](
            (proxy.a !== 1 ? "rgba(" : "rgb(") +
              (proxy.r | 0) +
              ", " +
              (proxy.g | 0) +
              ", " +
              (proxy.b | 0) +
              (proxy.a !== 1 ? ", " + proxy.a : "") +
              ")"
          );
          sp = sp._next;
        }
      }

      // Handle array tweens
      if (arrayTweens) {
        i = arrayTweens.length;
        while (--i > -1) {
          e = arrayTweens[i];
          val = e.s + e.c * progress;
          e.a[e.i] = val < 0.000001 && val > -0.000001 ? 0 : val;
        }
        for (p in data._arrayProps) {
          target[p](data._arrayProps[p]);
        }
      }

      // Handle layer drawing
      if (layer && !layer._gsDraw) {
        _layersToDraw.push(layer);
        layer._gsDraw = true;
        if (!_listening) {
          gsap.ticker.add(_onTick);
          _listening = true;
        }
      }
    },

    kill: function (property) {
      // Clean up any special properties
      return true;
    },

    _initArrayTween: function (a, b, prop) {
      if (!this._arrayTweens) {
        this._arrayTweens = [];
        this._arrayProps = {};
      }
      var i = a.length,
        tweens = this._arrayTweens,
        start,
        end;
      while (--i > -1) {
        start = a[i];
        end = b[i];
        if (start !== end) {
          tweens.push({ a: a, i: i, s: start, c: end - start });
        }
      }
      if (tweens.length) {
        this._arrayProps[prop] = a;
      }
    },
  });
})();
