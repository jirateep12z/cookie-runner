(function (root, factory) {
  'use strict';
  if (typeof define === 'function' && define.amd) {
    define([], factory);
  } else if (typeof exports !== 'undefined') {
    module.exports = factory();
  } else {
    root.EasyWheel = factory();
  }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  class EasyWheel {
    static EASING_FUNCTIONS = {
      EasyWheel: (time, duration) => 1 - Math.pow(1 - time / duration, 4),
      EaseOutQuad: (time, duration) => -(time /= duration) * (time - 2),
      EaseOutCubic: (time, duration) => {
        const t = time / duration - 1;
        return t * t * t + 1;
      },
      EaseOutQuart: (time, duration) => {
        const t = time / duration - 1;
        return 1 - t * t * t * t;
      },
      EaseOutExpo: (time, duration) => {
        return time === duration ? 1 : 1 - Math.pow(2, (-10 * time) / duration);
      },
      EaseInOutCubic: (time, duration) => {
        const t = time / duration;
        return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
      },
      MarkerEasing: time => {
        const result = 1 - Math.pow(1 - 6 * time, 2);
        return result < 0 ? 0 : result;
      }
    };

    static DEFAULT_OPTIONS = {
      items: [
        { name: 'Win', color: '#3498db' },
        { name: 'Lose', color: '#ffc107' }
      ],
      width: 400,
      font_size: 14,
      text_offset: 8,
      text_line: 'h',
      text_arc: false,
      letter_spacing: 0,
      text_color: '#fff',
      center_width: 45,
      shadow: '#fff0',
      shadow_opacity: 0,
      center_line_width: 5,
      center_line_color: '#424242',
      center_background: '#8e44ad',
      slice_line_width: 5,
      slice_line_color: '#424242',
      selected_slice_color: '#333',
      outer_line_color: '#424242',
      outer_line_width: 5,
      center_image: '',
      center_html: '',
      center_html_width: 45,
      center_image_width: 45,
      lazy_load_images: true,
      image_size: 30,
      rotate_center: false,
      center_class: '',
      button: '',
      easing: 'EasyWheel',
      marker_animation: true,
      marker_color: '#CC3333',
      selector: false,
      selected: false,
      random: false,
      type: 'spin',
      duration: 8000,
      min_duration: 0,
      max_duration: 0,
      rotates: 8,
      min_rotates: 0,
      max_rotates: 0,
      max: 0,
      frame: 16,
      fetch_options: null,
      on_before_spin: () => true,
      on_start: () => {},
      on_step: () => {},
      on_progress: () => {},
      on_complete: () => {},
      on_fail: () => {},
      on_sound: null,
      sounds: { spin: null, tick: null, win: null },
      confetti: false,
      reverse: false,
      marker_html: ''
    };

    constructor(element, options = {}) {
      if (typeof element === 'string') {
        this.$wheel = document.querySelector(element);
      } else {
        this.$wheel = element;
      }
      if (!this.$wheel) {
        throw new Error('EasyWheel: Element not found');
      }
      const data_options = this._ParseDataOptions();
      this.o = { ...EasyWheel.DEFAULT_OPTIONS, ...options, ...data_options };
      this._InitializeState();
      this.instanceUid = 'ew' + this.GenerateGuid();
      this.Validate();
      this.Init();
    }

    _ParseDataOptions() {
      const dataset = this.$wheel.dataset;
      const options = {};
      for (const key in dataset) {
        if (key.startsWith('easywheel')) {
          const option_key = key.replace('easywheel', '').toLowerCase();
          try {
            options[option_key] = JSON.parse(dataset[key]);
          } catch {
            options[option_key] = dataset[key];
          }
        }
      }
      return options;
    }

    _InitializeState() {
      this.slice = { id: null, results: null };
      this.currentSliceData = { id: null, results: null };
      this.winner = 0;
      this.rotates = parseInt(this.o.rotates);
      this.spinCount = 0;
      this.counter = 0;
      this.now = 0;
      this.resetCount = 0;
      this.currentSlice = 0;
      this.currentStep = 0;
      this.lastStep = 0;
      this.slicePercent = 0;
      this.circlePercent = 0;
      this.items = this.o.items;
      this.spinning = null;
      this.inProgress = false;
      this.isPaused = false;
      this.nonce = null;
      this._animation_frame_id = null;
      this._cached_elements = null;
      this._spin_history = [];
      this._pause_state = null;
      this._is_tab_visible = true;
      this._audio_cache = {};
    }

    _CacheElements() {
      this._cached_elements = {
        $slices: this.$wheel.querySelectorAll('svg > g.ew-slices-group > path'),
        $titles: this.$wheel.querySelectorAll('.ew-txt > .ew-title'),
        $marker: this.$wheel.querySelector('.ew-marker'),
        $wrapper: this.$wheel.querySelector('.ew-wrapper')
      };
    }

    _GetCachedElements() {
      if (!this._cached_elements) {
        this._CacheElements();
      }
      return this._cached_elements;
    }

    static VALIDATION_RULES = {
      sliceLineWidth: { max: 10, message: 'Max sliceLineWidth is "10"' },
      centerLineWidth: { max: 10, message: 'Max centerLineWidth is "10"' },
      outerLineWidth: { max: 10, message: 'Max outerLineWidth is "10"' }
    };

    Validate() {
      if (this.rotates < 1) {
        this.rotates = 1;
        console.warn('EasyWheel: Min number of rotates is "1"');
      }
      this._ValidateLineWidths();
      if (!EasyWheel.EASING_FUNCTIONS[this.o.easing]) {
        this.o.easing = 'easyWheel';
      }
    }

    _ValidateLineWidths() {
      const rules = EasyWheel.VALIDATION_RULES;
      for (const [key, rule] of Object.entries(rules)) {
        if (parseInt(this.o[key]) > rule.max) {
          this.o[key] = rule.max;
          console.warn(`EasyWheel: ${rule.message}`);
        }
      }
    }

    Destroy(remove_html = false) {
      this.Finish();
      if (remove_html) {
        this.$wheel.innerHTML = '';
        this.$wheel.classList.remove('easy-wheel', this.instanceUid);
      }
      this._InitializeState();
      this._RemoveEventListeners();
    }

    _RemoveEventListeners() {
      if (this._button_handler) {
        document.removeEventListener('click', this._button_handler);
      }
      if (this._resize_handler) {
        window.removeEventListener('resize', this._resize_handler);
      }
    }

    Option(key, value) {
      if (typeof value === 'undefined' || typeof value === 'function') return;
      if (
        typeof this.o[key] === 'undefined' ||
        typeof this.o[key] === 'function'
      )
        return;
      const allowed_options = ['easing', 'type', 'duration', 'rotates', 'max'];
      if (allowed_options.includes(key)) {
        this.o[key] = value;
      }
    }

    Finish() {
      if (this._animation_frame_id) {
        cancelAnimationFrame(this._animation_frame_id);
        this._animation_frame_id = null;
        this.inProgress = false;
      }
    }

    Init() {
      this.Initialize();
      this.Execute();
    }

    Initialize() {
      this.$wheel.classList.add('easy-wheel', this.instanceUid);

      const degree_per_slice = 360 / this.GetTotalSlices();
      let start_angle = 0;
      let end_angle = 0;
      this.$wheel.innerHTML = '';
      const $wrapper = this._CreateElement('div', { class: 'ew-wrapper' });
      const $inner = this._CreateElement('div', { class: 'ew-inner' });
      const $wheel_el = this._CreateElement('div', { class: 'ew-wheel' });
      const $bg_layer = this._CreateElement('div', {
        class: 'ew-bg-layer'
      });
      this.$wheel.appendChild($wrapper);
      $wrapper.appendChild($inner);
      $inner.insertBefore($wheel_el, $inner.firstChild);
      $wheel_el.appendChild($bg_layer);
      const $svg = this.CreateSVGElement('svg', {
        version: '1.1',
        xmlns: 'http://www.w3.org/2000/svg',
        'xmlns:xlink': 'http://www.w3.org/1999/xlink',
        x: '0px',
        y: '0px',
        viewBox: '0 0 200 200',
        'xml:space': 'preserve',
        style: 'enable-background:new 0 0 200 200;'
      });
      $bg_layer.appendChild($svg);
      const $slices_group = this.CreateSVGElement('g', {
        class: 'ew-slices-group'
      });
      const $lines_group = this.CreateSVGElement('g');
      $svg.appendChild($slices_group);
      this._RenderShadow($svg);
      $svg.appendChild($lines_group);
      const text_elements = this._CreateTextContainer($wheel_el, $svg);
      this._RenderCenter($wheel_el, $inner);
      this._RenderMarker($wrapper);
      this._RenderSlices(
        $slices_group,
        $lines_group,
        text_elements,
        degree_per_slice,
        start_angle,
        end_angle
      );
      this._RenderCenterCircle($svg);
      this._RenderOuterCircle($svg);
      $bg_layer.innerHTML = $bg_layer.innerHTML;
      this.$wrapper = $wrapper;
      this.$wheel_el = this.$wheel.querySelector('.ew-wheel');
    }

    _CreateElement(tag, attributes = {}) {
      const element = document.createElement(tag);
      for (const [key, value] of Object.entries(attributes)) {
        if (key === 'class') {
          element.className = value;
        } else {
          element.setAttribute(key, value);
        }
      }
      return element;
    }

    _RenderShadow($svg) {
      if (typeof this.o.shadow !== 'string' || this.o.shadow.trim() === '')
        return;
      const $gradient = this.CreateSVGElement('radialGradient', {
        id: 'SVGID_1_',
        cx: '50%',
        cy: '50%',
        r: '50%',
        gradientUnits: 'userSpaceOnUse'
      });
      const stops = [
        { offset: '0.1676', opacity: '1' },
        { offset: '0.5551', opacity: '1' },
        { offset: '0.6189', opacity: '1' },
        { offset: '1', opacity: '0' }
      ];
      stops.forEach(stop => {
        const $stop = this.CreateSVGElement('stop', {
          offset: stop.offset,
          style: `stop-color:${this.o.shadow};stop-opacity:${stop.opacity}`
        });
        $gradient.appendChild($stop);
      });
      $svg.appendChild($gradient);
      const opacity =
        parseInt(this.o.shadow_opacity) < 9
          ? '0.' + parseInt(this.o.shadow_opacity)
          : '1';
      const $circle = this.CreateSVGElement('circle', {
        cx: '50%',
        cy: '50%',
        r: '50%',
        'stroke-width': '0',
        'fill-opacity': opacity,
        fill: 'url(#SVGID_1_)'
      });
      $svg.appendChild($circle);
    }

    _CreateTextContainer($wheel, $svg) {
      if (this.o.text_line === 'v' || this.o.text_line === 'vertical') {
        const $text_wrap = this._CreateElement('div', {
          class: 'ew-txt-wrap'
        });
        const $text = this._CreateElement('div', { class: 'ew-txt' });
        const rotation = -360 / this.GetTotalSlices() / 2 + this.GetDegree();
        $text.style.transform = `rotate(${rotation}deg)`;
        $text_wrap.appendChild($text);
        $wheel.appendChild($text_wrap);
        return { type: 'vertical', $text };
      } else {
        const $text_group = this.CreateSVGElement('g');
        const $defs = this.CreateSVGElement('defs');
        $svg.appendChild($defs);
        $svg.appendChild($text_group);
        return { type: 'horizontal', $text_group, $defs };
      }
    }

    _RenderCenter($wheel, $inner) {
      const $center = this._CreateElement('div', { class: 'ew-center' });
      if (this.o.center_class) {
        $center.classList.add(this.o.center_class);
      }
      const parent =
        this.o.rotate_center === true || this.o.rotate_center === 'true'
          ? $wheel
          : $inner;
      parent.appendChild($center);
      if (
        typeof this.o.center_html === 'string' &&
        this.o.center_html.trim() === '' &&
        typeof this.o.center_image === 'string' &&
        this.o.center_image.trim() !== ''
      ) {
        const $image = this._CreateElement('img');
        if (!parseInt(this.o.center_image_width)) {
          this.o.center_image_width = parseInt(this.o.center_width);
        }
        $image.style.width = parseInt(this.o.center_image_width) + '%';
        $image.src = this.o.center_image;
        $center.appendChild($image);
        const $empty = this._CreateElement('div', { class: 'ew-center-empty' });
        $empty.style.width = parseInt(this.o.center_image_width) + '%';
        $empty.style.height = parseInt(this.o.center_image_width) + '%';
        $center.appendChild($empty);
      }
      if (
        typeof this.o.center_html === 'string' &&
        this.o.center_html.trim() !== ''
      ) {
        const $html = this._CreateElement('div', { class: 'ew-center-html' });
        $html.innerHTML = this.o.center_html;
        if (!parseInt(this.o.center_html_width)) {
          this.o.center_html_width = parseInt(this.o.center_width);
        }
        $html.style.width = parseInt(this.o.center_html_width) + '%';
        $html.style.height = parseInt(this.o.center_html_width) + '%';
        $center.appendChild($html);
      }
    }

    _RenderMarker($wrapper) {
      if (this.o.type.trim() === 'color') return;
      const $marker = this._CreateElement('div', { class: 'ew-marker' });
      if (this.o.marker_html && this.o.marker_html.trim() !== '') {
        $marker.innerHTML = this.o.marker_html;
      } else {
        $marker.innerHTML = `
          <svg version="1.1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" x="0px" y="0px" viewBox="0 0 80 115" style="enable-background:new 0 0 80 115;" xml:space="preserve">
            <g>
              <path fill="${this.o.marker_color}" d="M40,0C17.9,0,0,17.7,0,39.4S40,115,40,115s40-53.9,40-75.6S62.1,0,40,0z M40,52.5c-7,0-12.6-5.6-12.6-12.4 S33,27.7,40,27.7s12.6,5.6,12.6,12.4C52.6,46.9,47,52.5,40,52.5z"/>
              <path fill="rgba(0, 0, 0, 0.3)" d="M40,19.2c-11.7,0-21.2,9.3-21.2,20.8S28.3,60.8,40,60.8S61.2,51.5,61.2,40S51.7,19.2,40,19.2z M40,52.5 c-7,0-12.6-5.6-12.6-12.4S33,27.7,40,27.7s12.6,5.6,12.6,12.4C52.6,46.9,47,52.5,40,52.5z"/>
            </g>
          </svg>`;
      }
      $wrapper.appendChild($marker);
    }

    _RenderSlices(
      $slices_group,
      $lines_group,
      text_elements,
      degree_per_slice,
      start_angle,
      end_angle
    ) {
      this.items.forEach((item, index) => {
        const rotation = (360 / this.GetTotalSlices()) * index;
        end_angle += degree_per_slice;
        const slice_path = this.CalculateAnnularSector({
          centerX: 100,
          centerY: 100,
          startDegrees: start_angle,
          endDegrees: end_angle,
          innerRadius: parseInt(this.o.center_width),
          outerRadius: 100.5 - parseInt(this.o.outer_line_width)
        });
        const $slice = this.CreateSVGElement('path', {
          'stroke-width': '0',
          fill: item.color,
          'data-fill': item.color,
          d: slice_path
        });
        $slices_group.appendChild($slice);
        const $line = this.CreateSVGElement('path', {
          'stroke-width': '0',
          fill: this.o.slice_line_color,
          d: this.CalculateAnnularSector(
            {
              centerX: 100,
              centerY: 100,
              startDegrees: end_angle + 0.2,
              endDegrees: end_angle - 0.2,
              innerRadius: parseInt(this.o.center_width),
              outerRadius: 100.5 - parseInt(this.o.outer_line_width)
            },
            true
          )
        });
        $lines_group.appendChild($line);
        const text_color =
          this.o.text_color.trim() !== 'auto'
            ? this.o.text_color.trim()
            : this.CalculateBrightness(item.color);
        this._RenderSliceText(
          text_elements,
          item,
          index,
          rotation,
          text_color,
          slice_path
        );
        start_angle += degree_per_slice;
      });
    }

    _RenderSliceText(
      text_elements,
      item,
      index,
      rotation,
      text_color,
      slice_path
    ) {
      if (text_elements.type === 'vertical') {
        const $title = this._CreateElement('div', { class: 'ew-title' });
        $title.innerHTML = this._RenderSliceContent(item);
        $title.style.paddingRight = parseInt(this.o.text_offset) + '%';
        $title.style.transform = `rotate(${rotation}deg) translate(0px, -50%)`;
        $title.style.color = text_color;
        text_elements.$text.appendChild($title);
        if (this.ConvertToNumber(this.o.letter_spacing) > 0) {
          text_elements.$text.style.letterSpacing =
            this.ConvertToNumber(this.o.letter_spacing) + 'px';
        }
      } else {
        const $text = this.CreateSVGElement('text', {
          'stroke-width': '0',
          fill: text_color,
          dy: this.ConvertToNumber(this.o.text_offset) + '%'
        });
        const $text_path = this.CreateSVGElement('textPath', {
          'xlink:href': `#ew-text-${index}`,
          startOffset: '50%',
          style: 'text-anchor: middle;'
        });
        $text_path.textContent = item.name;
        $text.appendChild($text_path);
        text_elements.$text_group.style.fontSize =
          parseInt(this.o.font_size) / 2 + 'px';
        if (parseInt(this.o.letter_spacing) > 0) {
          text_elements.$text_group.style.letterSpacing =
            parseInt(this.o.letter_spacing) + 'px';
        }
        text_elements.$text_group.appendChild($text);
        let text_path_d = /(^.+?)L/.exec(slice_path)[1];
        if (this.o.text_arc !== true) {
          const arc_start = /(^.+?)A/.exec(text_path_d);
          const after_arc = text_path_d.replace(arc_start[0], '');
          const first_comma = /(^.+?),/.exec(after_arc);
          const modified = after_arc.replace(first_comma[1], '0');
          text_path_d = text_path_d.replace(after_arc, modified);
        }
        const $path = this.CreateSVGElement('path', {
          'stroke-width': '0',
          fill: 'none',
          id: `ew-text-${index}`,
          d: text_path_d
        });
        text_elements.$defs.appendChild($path);
      }
    }

    _RenderSliceContent(item) {
      if (!item.image) return item.name;
      const size = parseInt(this.o.image_size);
      const loading = this.o.lazy_load_images ? 'loading="lazy"' : '';
      return `<img src="${item.image}" alt="${item.name}" ${loading} style="width:${size}px;height:${size}px;object-fit:contain;vertical-align:middle;margin-right:4px;"><span>${item.name}</span>`;
    }

    _PreloadImages() {
      if (!this.o.lazy_load_images) {
        this.items.forEach(item => {
          if (item.image) {
            const img = new Image();
            img.src = item.image;
          }
        });
      }
    }

    _RenderCenterCircle($svg) {
      const line_width = parseInt(this.o.slice_line_width);
      if (parseInt(this.o.center_width) <= line_width) return;
      const $circle = this.CreateSVGElement('circle', {
        class: 'ew-center-circle',
        cx: '100',
        cy: '100',
        r: String(parseInt(this.o.center_width) + 1),
        stroke: this.o.center_line_color,
        'stroke-width': String(parseInt(this.o.center_line_width)),
        fill: this.o.center_background
      });
      $svg.appendChild($circle);
    }

    _RenderOuterCircle($svg) {
      const $circle = this.CreateSVGElement('circle', {
        cx: '100',
        cy: '100',
        r: String(100 - parseInt(this.o.outer_line_width) / 2),
        stroke: this.o.outer_line_color,
        'stroke-width': String(parseInt(this.o.outer_line_width)),
        'fill-opacity': '0',
        fill: '#fff0'
      });
      $svg.appendChild($circle);
    }

    ConvertToNumber(value) {
      return isNaN(Number(value)) ? 0 : Number(value);
    }

    CreateSVGElement(tag, attributes = {}) {
      const element = document.createElementNS(
        'http://www.w3.org/2000/svg',
        tag
      );
      for (const [key, value] of Object.entries(attributes)) {
        if (key === 'xlink:href') {
          element.setAttributeNS('http://www.w3.org/1999/xlink', 'href', value);
        } else {
          element.setAttribute(key, value);
        }
      }
      return element;
    }

    CalculateAnnularSector(options, is_line = false) {
      const line_width = parseInt(this.o.slice_line_width);
      const computed = this._ComputeSectorDefaults(options);
      const deg_to_rad = deg => (deg * Math.PI) / 180;
      const points = [
        [
          computed.cx +
            computed.r2 *
              Math.cos(deg_to_rad(options.startDegrees + line_width / 4)),
          computed.cy +
            computed.r2 *
              Math.sin(deg_to_rad(options.startDegrees + line_width / 4))
        ],
        [
          computed.cx +
            computed.r2 *
              Math.cos(deg_to_rad(options.endDegrees - line_width / 4)),
          computed.cy +
            computed.r2 *
              Math.sin(deg_to_rad(options.endDegrees - line_width / 4))
        ],
        [
          computed.cx +
            computed.r1 * Math.cos(deg_to_rad(options.endDegrees - line_width)),
          computed.cy +
            computed.r1 * Math.sin(deg_to_rad(options.endDegrees - line_width))
        ],
        [
          computed.cx +
            computed.r1 *
              Math.cos(deg_to_rad(options.startDegrees + line_width)),
          computed.cy +
            computed.r1 *
              Math.sin(deg_to_rad(options.startDegrees + line_width))
        ]
      ];
      const large_arc =
        (computed.closeRadians - computed.startRadians) % (2 * Math.PI) >
        Math.PI
          ? 1
          : 0;
      let sweep = 1;
      let inner_sweep = 0;
      if (is_line && line_width >= parseInt(this.o.center_width)) {
        sweep = 0;
        inner_sweep = 1;
      } else if (!is_line && line_width >= parseInt(this.o.center_width)) {
        sweep = 1;
        inner_sweep = 1;
      }
      return [
        `M${points[0].join(',')}`,
        `A${computed.r2},${
          computed.r2
        },0,${large_arc},${sweep},${points[1].join(',')}`,
        `L${points[2].join(',')}`,
        `A${computed.r1},${
          computed.r1
        },0,${large_arc},${inner_sweep},${points[3].join(',')}`,
        'z'
      ].join(' ');
    }

    _ComputeSectorDefaults(options) {
      const computed = {
        cx: options.centerX || 0,
        cy: options.centerY || 0,
        startRadians: ((options.startDegrees || 0) * Math.PI) / 180,
        closeRadians: ((options.endDegrees || 0) * Math.PI) / 180
      };
      const thickness =
        options.thickness !== undefined ? options.thickness : 100;
      if (options.innerRadius !== undefined) {
        computed.r1 = options.innerRadius;
      } else if (options.outerRadius !== undefined) {
        computed.r1 = options.outerRadius - thickness;
      } else {
        computed.r1 = 200 - thickness;
      }
      computed.r2 =
        options.outerRadius !== undefined
          ? options.outerRadius
          : computed.r1 + thickness;
      if (computed.r1 < 0) computed.r1 = 0;
      if (computed.r2 < 0) computed.r2 = 0;
      return computed;
    }

    static NAMED_COLORS = {
      white: [255, 255, 255],
      black: [0, 0, 0],
      red: [255, 0, 0],
      green: [0, 128, 0],
      blue: [0, 0, 255],
      yellow: [255, 255, 0],
      orange: [255, 165, 0],
      purple: [128, 0, 128],
      pink: [255, 192, 203],
      gray: [128, 128, 128],
      grey: [128, 128, 128],
      cyan: [0, 255, 255]
    };

    CalculateBrightness(color) {
      const rgb = this._ParseColorToRgb(color);
      if (!rgb) return '#333';
      const brightness = (299 * rgb[0] + 587 * rgb[1] + 114 * rgb[2]) / 1000;
      return brightness < 125 ? '#fff' : '#333';
    }

    _ParseColorToRgb(color) {
      if (!color || typeof color !== 'string') return null;
      const c = color.trim().toLowerCase();
      if (EasyWheel.NAMED_COLORS[c]) {
        return EasyWheel.NAMED_COLORS[c];
      }
      if (c.startsWith('rgb')) {
        const match = c.match(/rgba?\s*\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/);
        return match
          ? [parseInt(match[1]), parseInt(match[2]), parseInt(match[3])]
          : null;
      }
      if (c.startsWith('#')) {
        const hex = c.slice(1);
        if (hex.length === 3) {
          return [
            parseInt(hex[0] + hex[0], 16),
            parseInt(hex[1] + hex[1], 16),
            parseInt(hex[2] + hex[2], 16)
          ];
        }
        if (hex.length >= 6) {
          return [
            parseInt(hex.slice(0, 2), 16),
            parseInt(hex.slice(2, 4), 16),
            parseInt(hex.slice(4, 6), 16)
          ];
        }
      }
      return null;
    }

    GenerateGuid(length = 8) {
      const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
      let result = '';
      for (let i = 0; i < length; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
      }
      return result;
    }

    ScaleFont() {
      let scale =
        1 +
        (this.$wheel.offsetWidth - parseInt(this.o.width)) /
          parseInt(this.o.width);
      scale = Math.max(0.1, Math.min(4, scale));
      const wrapper = this.$wheel.querySelector('.ew-wrapper');
      if (wrapper) {
        wrapper.style.fontSize = 100 * scale + '%';
      }
    }

    GetTotalSlices() {
      return this.items.length;
    }

    GetDegree() {
      return 360 / this.GetTotalSlices();
    }

    GetDegreeStart(index) {
      return 360 - this.GetDegree() * index;
    }

    GetDegreeEnd(index) {
      return 360 - (this.GetDegree() * index + this.GetDegree());
    }

    GetRandomInt(min, max) {
      return Math.floor(Math.random() * (max - min + 1) + min);
    }

    _GetSpinDuration() {
      const min = parseInt(this.o.min_duration);
      const max = parseInt(this.o.max_duration);
      if (min > 0 && max > min) {
        return this.GetRandomInt(min, max);
      }
      return parseInt(this.o.duration);
    }

    _GetSpinRotates() {
      const min = parseInt(this.o.min_rotates);
      const max = parseInt(this.o.max_rotates);
      if (min > 0 && max > min) {
        return this.GetRandomInt(min, max);
      }
      return parseInt(this.rotates);
    }

    CalculateSliceSize(index) {
      const offset = parseInt(this.o.slice_line_width) + 2;
      return {
        start: this.GetDegreeStart(index) - offset,
        end: this.GetDegreeEnd(index) + offset
      };
    }

    GetWinnerSelector() {
      const result = {};
      if (typeof this.o.selector !== 'string') return result;
      this.items.forEach((item, index) => {
        if (
          typeof item[this.o.selector] === 'object' ||
          Array.isArray(item[this.o.selector]) ||
          item[this.o.selector] === undefined
        ) {
          return;
        }
        result[index] = item[this.o.selector];
      });
      return result;
    }

    FindWinner(value, mode) {
      if (
        mode !== 'custom' &&
        (typeof this.o.selector !== 'string' || typeof value === 'number')
      ) {
        if (this.items[value] === undefined) return;
        return value;
      }
      let winner_index;
      this.items.forEach((item, index) => {
        if (
          typeof item[this.o.selector] !== 'object' &&
          !Array.isArray(item[this.o.selector]) &&
          item[this.o.selector] !== undefined &&
          item[this.o.selector] === value
        ) {
          winner_index = index;
        }
      });
      return winner_index;
    }

    GetSelectedSliceId(spin_index) {
      const selectors = this.GetWinnerSelector();
      let selected = this.o.selected;
      if (
        typeof selected === 'object' &&
        selected !== null &&
        !Array.isArray(selected)
      ) {
        if (selected.selectedIndex !== undefined) {
          return selected.selectedIndex;
        }
      } else if (Array.isArray(selected)) {
        if (this.o.selector !== false) {
          const keys = Object.keys(selectors);
          for (const key of keys) {
            if (selectors[key] === this.o.selected[spin_index]) {
              return parseInt(key);
            }
          }
        } else {
          selected = selected[spin_index];
        }
      } else if (typeof selected === 'string' && this.o.selector !== false) {
        selected = this.FindWinner(selected);
      } else if (typeof selected !== 'number') {
        return;
      }
      if (this.FindWinner(parseInt(selected)) !== undefined) {
        return parseInt(selected);
      }
    }

    SendFetchRequest(options) {
      const request_options = {
        method: options.method || 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      };
      const data = options.data || {};
      if (options.nonce === true) {
        data.nonce = this.GenerateGuid(8);
        this.nonce = data.nonce;
      }
      data.lastSpin = this.counter !== 0 ? this.slice.results : false;
      if (request_options.method === 'POST') {
        request_options.body = JSON.stringify(data);
      } else {
        const params = new URLSearchParams(data);
        options.url += '?' + params.toString();
      }
      fetch(options.url, request_options)
        .then(response => response.json())
        .then(response => {
          if (this.nonce) {
            if (typeof response.nonce !== 'string') {
              console.error('EasyWheel: Nonce Type Incorrect');
            }
            if (response.nonce !== this.nonce) {
              this.o.on_fail.call(
                this.$wheel,
                this.slice.results,
                this.spinCount,
                this.now
              );
              return;
            }
          }
          if (response.selector !== undefined) {
            this.o.selector = response.selector;
            this.o.selected = [response.winner];
          }
          if (response.stop !== true && response.stop !== 'true') {
            this.Run(response.winner);
          }
        })
        .catch(() => {
          this.o.on_fail.call(
            this.$wheel,
            this.slice.results,
            this.spinCount,
            this.now
          );
        });
    }

    Start() {
      if (
        this.o.fetch_options &&
        typeof this.o.fetch_options === 'object' &&
        Object.keys(this.o.fetch_options).length > 0
      ) {
        this.SendFetchRequest(this.o.fetch_options);
      } else {
        this.Run();
      }
    }

    Run(winner_value) {
      if (this.inProgress) return;
      if (this.o.on_before_spin.call(this.$wheel, this.spinCount) === false)
        return;
      if (winner_value !== undefined) {
        const winner_index = this.FindWinner(winner_value, 'custom');
        if (winner_index === undefined) return;
        this.slice.id = winner_index;
      } else {
        if (this.o.max !== 0 && this.counter >= this.o.max) return;
        if (this.o.selector !== false) {
          this.slice.id = this.GetSelectedSliceId(this.resetCount);
        } else {
          if (this.o.random !== true) return;
          this.slice.id = this._GetWeightedRandomSlice();
        }
        if (this.o.random !== true && this.GetTotalSlices() <= this.resetCount)
          return;
        if (
          this.o.random === true &&
          this.GetTotalSlices() <= this.resetCount
        ) {
          this.resetCount = 0;
        }
        if (this.slice.id === undefined) {
          this.resetCount++;
          this.Run(winner_value);
          return;
        }
      }
      this.inProgress = true;
      if (this.items[this.slice.id] === undefined) return;
      this.slice.results = this.items[this.slice.id];
      this.slice.length = this.slice.id;
      this.o.on_start.call(
        this.$wheel,
        this.slice.results,
        this.spinCount,
        this.now
      );
      this._PlaySound('spin');
      const slice_size = this.CalculateSliceSize(this.slice.id);
      const random_degree = this.GetRandomInt(slice_size.start, slice_size.end);
      const spin_rotates = this._GetSpinRotates();
      const direction = this.o.reverse ? -1 : 1;
      const target_degree = direction * (360 * spin_rotates + random_degree);
      this.lastStep = -1;
      this.currentStep = 0;
      const reversed_slices = Array.from(
        { length: this.GetTotalSlices() },
        (_, i) => i
      ).reverse();
      const start_time = performance.now();
      const start_degree = this.now;
      const duration = this._GetSpinDuration();
      const easing_fn = EasyWheel.EASING_FUNCTIONS[this.o.easing];
      const Animate = current_time => {
        const elapsed = current_time - start_time;
        const progress = Math.min(elapsed / duration, 1);
        const eased_progress = easing_fn(elapsed, duration);
        const current_degree =
          start_degree + (target_degree - start_degree) * eased_progress;
        this.now = current_degree % 360;
        if (this.o.type.trim() !== 'color' && this.$wheel_el) {
          this.$wheel_el.style.transform = `rotate(${this.now}deg)`;
        }
        this.currentStep = Math.floor(
          current_degree / (360 / this.GetTotalSlices())
        );
        this.currentSlice =
          reversed_slices[this.currentStep % this.GetTotalSlices()];
        const total = this.GetTotalSlices();
        const slice_unit = 1600 / total;
        this.circlePercent = (((1600 / 360) * this.now) / 1600) * 100;
        this.slicePercent =
          (((this.currentSlice + 1) * slice_unit -
            (1600 - (1600 / 360) * this.now)) /
            slice_unit) *
          100;
        this.o.on_progress.call(
          this.$wheel,
          this.slicePercent,
          this.circlePercent
        );
        if (this.lastStep !== this.currentStep) {
          this.lastStep = this.currentStep;
          this._AnimateMarker();
          this._HighlightCurrentSlice();
          this._PlaySound('tick');
          this.currentSliceData.id = this.currentSlice;
          this.currentSliceData.results = this.items[this.currentSliceData.id];
          this.currentSliceData.results.length = this.currentSliceData.id;
          this.o.on_step.call(
            this.$wheel,
            this.currentSliceData.results,
            this.slicePercent,
            this.circlePercent
          );
        }
        if (progress < 1 && !this.isPaused) {
          this._animation_frame_id = requestAnimationFrame(Animate);
        } else if (progress >= 1) {
          this.inProgress = false;
          this._PlaySound('win');
          this._AddToHistory(this.slice.results);
          this._TriggerConfetti();
          this.o.on_complete.call(
            this.$wheel,
            this.slice.results,
            this.spinCount,
            this.now
          );
        }
      };
      this._animation_frame_id = requestAnimationFrame(Animate);
      this.counter++;
      this.spinCount++;
      this.resetCount++;
    }

    _AnimateMarker() {
      const excluded = [
        'easeInElastic',
        'easeInBack',
        'easeInBounce',
        'easeOutElastic',
        'easeOutBack',
        'easeOutBounce',
        'easeInOutElastic',
        'easeInOutBack',
        'easeInOutBounce'
      ];
      if (
        this.o.marker_animation !== true ||
        excluded.includes(this.o.easing.trim())
      )
        return;
      const { $marker } = this._GetCachedElements();
      if (!$marker) return;
      const duration = parseInt(this.o.duration) / this.GetTotalSlices() / 2;
      const target = -38;
      const start_time = performance.now();
      const AnimateMarker = current_time => {
        const elapsed = current_time - start_time;
        const progress = Math.min(elapsed / duration, 1);
        const eased = EasyWheel.EASING_FUNCTIONS.MarkerEasing(progress);
        $marker.style.transform = `rotate(${target * eased}deg)`;
        if (progress < 1) {
          requestAnimationFrame(AnimateMarker);
        }
      };
      requestAnimationFrame(AnimateMarker);
    }

    _HighlightCurrentSlice() {
      const is_color_mode = this.o.type.trim() === 'color';
      const class_name = is_color_mode ? 'ew-ccurrent' : 'ew-current';
      const { $slices, $titles } = this._GetCachedElements();
      const current = this.currentSlice;
      $slices.forEach(($slice, index) => {
        const is_current = index === current;
        $slice.setAttribute('class', is_current ? class_name : '');
        if (is_color_mode) {
          $slice.setAttribute(
            'fill',
            is_current
              ? this.o.selected_slice_color
              : $slice.getAttribute('data-fill')
          );
        }
      });
      $titles.forEach(($t, index) => {
        $t.classList.toggle(class_name, index === current);
      });
    }

    Execute() {
      this.currentSlice = this.GetTotalSlices() - 1;
      if (typeof this.o.button === 'string' && this.o.button.trim() !== '') {
        this._button_handler = e => {
          if (e.target.matches(this.o.button)) {
            e.preventDefault();
            this.Start();
          }
        };
        document.addEventListener('click', this._button_handler);
      }
      this._CacheElements();
      this.$wheel.style.fontSize = parseInt(this.o.font_size) + 'px';
      this.$wheel.style.width = parseInt(this.o.width) + 'px';
      this._UpdateWheelSize();
      this.ScaleFont();
      this._resize_timeout = null;
      this._resize_handler = () => {
        if (this._resize_timeout) clearTimeout(this._resize_timeout);
        this._resize_timeout = setTimeout(() => this._UpdateWheelSize(), 100);
      };
      window.addEventListener('resize', this._resize_handler);
    }

    _UpdateWheelSize() {
      const size = this.$wheel.offsetWidth;
      this.$wheel.style.height = size + 'px';
      const { $wrapper } = this._GetCachedElements();
      if ($wrapper) {
        $wrapper.style.width = size + 'px';
        $wrapper.style.height = size + 'px';
      }
      this.ScaleFont();
    }

    _Debounce(func, wait) {
      let timeout;
      return (...args) => {
        clearTimeout(timeout);
        timeout = setTimeout(() => func.apply(this, args), wait);
      };
    }

    GetHistory() {
      return [...this._spin_history];
    }

    ClearHistory() {
      this._spin_history = [];
    }

    _AddToHistory(result) {
      this._spin_history.push({
        result: result,
        timestamp: Date.now(),
        spinCount: this.spinCount
      });
    }

    _GetWeightedRandomSlice() {
      const weights = this.items.map(item => item.weight || 1);
      const total_weight = weights.reduce((sum, w) => sum + w, 0);
      let random = Math.random() * total_weight;
      for (let i = 0; i < weights.length; i++) {
        random -= weights[i];
        if (random <= 0) return i;
      }
      return weights.length - 1;
    }

    Pause() {
      if (!this.inProgress || this.isPaused) return false;
      this.isPaused = true;
      if (this._animation_frame_id) {
        cancelAnimationFrame(this._animation_frame_id);
        this._animation_frame_id = null;
      }
      return true;
    }

    Resume() {
      if (!this.inProgress || !this.isPaused) return false;
      this.isPaused = false;
      return true;
    }

    _PlaySound(type) {
      if (!this.o.sounds[type] && !this.o.on_sound) return;
      if (this.o.on_sound) {
        this.o.on_sound.call(this.$wheel, type, this.currentSlice);
        return;
      }
      if (!this._audio_cache[type] && this.o.sounds[type]) {
        this._audio_cache[type] = new Audio(this.o.sounds[type]);
      }
      if (this._audio_cache[type]) {
        this._audio_cache[type].currentTime = 0;
        this._audio_cache[type].play().catch(() => {});
      }
    }

    _TriggerConfetti() {
      if (!this.o.confetti) return;
      if (typeof this.o.confetti === 'function') {
        this.o.confetti.call(this.$wheel, this.slice.results);
        return;
      }
      this._SimpleConfetti();
    }

    _SimpleConfetti() {
      const colors = ['#ff0', '#f0f', '#0ff', '#f00', '#0f0', '#00f'];
      const container = this.$wheel;
      for (let i = 0; i < 50; i++) {
        const confetti = document.createElement('div');
        confetti.style.cssText = `
          position:absolute;width:10px;height:10px;
          background:${colors[Math.floor(Math.random() * colors.length)]};
          left:${50 + (Math.random() - 0.5) * 20}%;top:50%;
          pointer-events:none;z-index:100;border-radius:50%;
          animation:ew-confetti 1s ease-out forwards;
          transform:translate(-50%,-50%) rotate(${Math.random() * 360}deg);
        `;
        container.appendChild(confetti);
        setTimeout(() => confetti.remove(), 1000);
      }
    }

    _SetupVisibilityHandler() {
      document.addEventListener('visibilitychange', () => {
        this._is_tab_visible = !document.hidden;
      });
    }
  }

  return EasyWheel;
});
