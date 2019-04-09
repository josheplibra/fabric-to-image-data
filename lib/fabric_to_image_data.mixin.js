(function () {
  'use strict';

  var FabricToImageData = function (_module) {
    /**
       * @type {String}
       */
    _module = _module || 'fabric';

    /**
     * @type {Object}
     */
    var fabric;

    if (typeof _module !== 'string') {
      fabric = _module;
    } else if (typeof Buffer !== 'undefined' && typeof window === 'undefined') {
      fabric = require(_module).fabric;
    } else {
      fabric = window.fabric;
    }

    if (fabric.util.toImageData) {
      fabric.warn('fabric.util.toImageData is already defined');
      return;
    } else {
      fabric.util.toImageData = function (canvasEl, sx, sy, sw, sh) {
        sx = sx || 0;
        sy = sy || 0;
        sw = sw || 1;
        sh = sh || 1;
        return canvasEl.getImageData(sx, sy, sw, sh);
      };
    }

    if (fabric.StaticCanvas.prototype.toImageData) {
      fabric.warn('fabric.StaticCanvas.prototype.toImageData is already defined');
    } else {
      if (!fabric.StaticCanvas.prototype.toCanvasElement) {
        /**
         * Create a new HTMLCanvas element painted with the current canvas content.
         * No need to resize the actual one or repaint it.
         * Will transfer object ownership to a new canvas, paint it, and set everything back.
         * This is an intermediary step used to get to a dataUrl but also it is usefull to
         * create quick image copies of a canvas without passing for the dataUrl string
         * @param {Number} [multiplier] a zoom factor.
         * @param {Object} [cropping] Cropping informations
         * @param {Number} [cropping.left] Cropping left offset.
         * @param {Number} [cropping.top] Cropping top offset.
         * @param {Number} [cropping.width] Cropping width.
         * @param {Number} [cropping.height] Cropping height.
         */
        fabric.StaticCanvas.prototype.toCanvasElement = function (multiplier, cropping) {
          multiplier = multiplier || 1;
          cropping = cropping || {};
          var scaledWidth = (cropping.width || this.width) * multiplier,
            scaledHeight = (cropping.height || this.height) * multiplier,
            zoom = this.getZoom(),
            originalWidth = this.width,
            originalHeight = this.height,
            newZoom = zoom * multiplier,
            vp = this.viewportTransform,
            translateX = (vp[4] - (cropping.left || 0)) * multiplier,
            translateY = (vp[5] - (cropping.top || 0)) * multiplier,
            originalInteractive = this.interactive,
            originalContext = this.contextContainer,
            newVp = [newZoom, 0, 0, newZoom, translateX, translateY],
            canvasEl = fabric.util.createCanvasElement();
          canvasEl.width = scaledWidth;
          canvasEl.height = scaledHeight;
          this.interactive = false;
          this.viewportTransform = newVp;
          this.width = scaledWidth;
          this.height = scaledHeight;
          this.calcViewportBoundaries();
          this.contextContainer = canvasEl.getContext('2d');
          // will be renderAllExport();
          this.renderAll();
          this.viewportTransform = vp;
          this.width = originalWidth;
          this.height = originalHeight;
          this.calcViewportBoundaries();
          this.contextContainer = originalContext;
          this.interactive = originalInteractive;
          return canvasEl;
        };
      }

      /**
       * Exports canvas element to a ImageData image. 
       * Note that when multiplier is used, cropping is scaled appropriately
       * @param {Object} [options] Options object
       * @param {Number} [options.multiplier=1] Multiplier to scale by, to have consistent
       * @param {Number} [options.left] Cropping left offset. 
       * @param {Number} [options.top] Cropping top offset. 
       * @param {Number} [options.width] Cropping width. 
       * @param {Number} [options.height] Cropping height. 
       * @param {Boolean} [options.enableRetinaScaling] Enable retina scaling for clone image.
       * @return {ImageData} Returns a ImageData
       * @example <caption>Generate cropped png ImageData (clipping of canvas)</caption>
       * var ImageData = canvas.toImageData({
       *   left: 100,
       *   top: 100,
       *   width: 200,
       *   height: 200
       * });
       * @example <caption>Generate double scaled png ImageData</caption>
       * var ImageData = canvas.toImageData({
       *   multiplier: 2
       * });
       */
      fabric.StaticCanvas.prototype.toImageData = function (options) {
        options || (options = {});

        var multiplier = (options.multiplier || 1) * (options.enableRetinaScaling ? this.getRetinaScaling() : 1),
          canvasEl = this.toCanvasElement(multiplier, options);
        return fabric.util.toImageData(canvasEl, 0, 0, canvasEl.width, canvasEl.height);
      };
    }

    /**
     * Converts an object into a HTMLCanvas element
     * @param {Object} options Options object
     * @param {Number} [options.multiplier=1] Multiplier to scale by
     * @param {Number} [options.left] Cropping left offset.
     * @param {Number} [options.top] Cropping top offset.
     * @param {Number} [options.width] Cropping width.
     * @param {Number} [options.height] Cropping height.
     * @param {Boolean} [options.enableRetinaScaling] Enable retina scaling for clone image.
     * @param {Boolean} [options.withoutTransform] Remove current object transform.
     * @param {Boolean} [options.withoutShadow] Remove current object shadow.
     * @return {ImageData} Returns a ImageData
     */
    if (fabric.StaticCanvas.prototype.toImageData) {
      fabric.warn('fabric.StaticCanvas.prototype.toImageData is already defined');
    } else {
      fabric.StaticCanvas.prototype.toImageData = function (options) {
        options || (options = {});
        options.multiplier || (options.multiplier = 1);

        var origParams = fabric.util.saveObjectTransform(this);

        if (options.withoutTransform) {
          fabric.util.resetObjectTransform(this);
        }

        var length = Math.max(this.getScaledWidth(), this.getScaledHeight());

        if (options.fixedLength) {
          var ratio = options.fixedLength / length;
          this.set('scaleX', this.scaleX * ratio);
          this.set('scaleY', this.scaleY * ratio);
        }

        if (options.fixedStrokeWidth) {
          origParams.strokeWidth = options.strokeWidth;
          this.set('strokeWidth', options.fixedStrokeWidth);
        }

        var el = fabric.util.createCanvasElement(),
          // skip canvas zoom and calculate with setCoords now.
          boundingRect = this.getBoundingRect(true, true);

        if (options.fixedLength) {
          el.width = el.height = options.fixedLength;
        } else {
          el.width = boundingRect.width;
          el.height = boundingRect.height;
        }
        var canvas = new fabric.StaticCanvas(el, {
          enableRetinaScaling: options.enableRetinaScaling,
          renderOnAddRemove: false,
          skipOffscreen: false,
        });

        canvas.backgroundColor = options.backgroundColor || '#fff';

        this.setPositionByOrigin(new fabric.Point(canvas.width / 2, canvas.height / 2), 'center', 'center');

        var originalCanvas = this.canvas;
        canvas.add(this);
        var centerPoint = this.getCenterPoint();
        canvas.absolutePan(new fabric.Point(centerPoint.x - el.width / 2, centerPoint.y - el.height / 2));
        var data = canvas.toImageData(options);
        this.set(origParams).setCoords();
        this.canvas = originalCanvas;
        // canvas.dispose will call image.dispose that will nullify the elements
        // since this canvas is a simple element for the process, we remove references
        // to objects in this way in order to avoid object trashing.
        canvas._objects = [];
        canvas.dispose();
        canvas = null;

        return data;
      };
    }

  };

  if (typeof module !== 'undefined' && typeof module.exports !== 'undefined') {
    module.exports = FabricToImageData;
  } else {
    FabricToImageData();
  }

})();