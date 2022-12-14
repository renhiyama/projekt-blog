var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __require = /* @__PURE__ */ ((x) => typeof require !== "undefined" ? require : typeof Proxy !== "undefined" ? new Proxy(x, {
  get: (a, b) => (typeof require !== "undefined" ? require : a)[b]
}) : x)(function(x) {
  if (typeof require !== "undefined")
    return require.apply(this, arguments);
  throw new Error('Dynamic require of "' + x + '" is not supported');
});
var __commonJS = (cb, mod) => function __require2() {
  return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));

// node_modules/ws/lib/constants.js
var require_constants = __commonJS({
  "node_modules/ws/lib/constants.js"(exports, module) {
    "use strict";
    module.exports = {
      BINARY_TYPES: ["nodebuffer", "arraybuffer", "fragments"],
      EMPTY_BUFFER: Buffer.alloc(0),
      GUID: "258EAFA5-E914-47DA-95CA-C5AB0DC85B11",
      kForOnEventAttribute: Symbol("kIsForOnEventAttribute"),
      kListener: Symbol("kListener"),
      kStatusCode: Symbol("status-code"),
      kWebSocket: Symbol("websocket"),
      NOOP: () => {
      }
    };
  }
});

// node_modules/ws/lib/buffer-util.js
var require_buffer_util = __commonJS({
  "node_modules/ws/lib/buffer-util.js"(exports, module) {
    "use strict";
    var { EMPTY_BUFFER } = require_constants();
    function concat(list, totalLength) {
      if (list.length === 0)
        return EMPTY_BUFFER;
      if (list.length === 1)
        return list[0];
      const target = Buffer.allocUnsafe(totalLength);
      let offset = 0;
      for (let i = 0; i < list.length; i++) {
        const buf = list[i];
        target.set(buf, offset);
        offset += buf.length;
      }
      if (offset < totalLength)
        return target.slice(0, offset);
      return target;
    }
    function _mask(source, mask, output, offset, length) {
      for (let i = 0; i < length; i++) {
        output[offset + i] = source[i] ^ mask[i & 3];
      }
    }
    function _unmask(buffer, mask) {
      for (let i = 0; i < buffer.length; i++) {
        buffer[i] ^= mask[i & 3];
      }
    }
    function toArrayBuffer(buf) {
      if (buf.byteLength === buf.buffer.byteLength) {
        return buf.buffer;
      }
      return buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);
    }
    function toBuffer(data) {
      toBuffer.readOnly = true;
      if (Buffer.isBuffer(data))
        return data;
      let buf;
      if (data instanceof ArrayBuffer) {
        buf = Buffer.from(data);
      } else if (ArrayBuffer.isView(data)) {
        buf = Buffer.from(data.buffer, data.byteOffset, data.byteLength);
      } else {
        buf = Buffer.from(data);
        toBuffer.readOnly = false;
      }
      return buf;
    }
    module.exports = {
      concat,
      mask: _mask,
      toArrayBuffer,
      toBuffer,
      unmask: _unmask
    };
    if (!process.env.WS_NO_BUFFER_UTIL) {
      try {
        const bufferUtil = __require("bufferutil");
        module.exports.mask = function(source, mask, output, offset, length) {
          if (length < 48)
            _mask(source, mask, output, offset, length);
          else
            bufferUtil.mask(source, mask, output, offset, length);
        };
        module.exports.unmask = function(buffer, mask) {
          if (buffer.length < 32)
            _unmask(buffer, mask);
          else
            bufferUtil.unmask(buffer, mask);
        };
      } catch (e) {
      }
    }
  }
});

// node_modules/ws/lib/limiter.js
var require_limiter = __commonJS({
  "node_modules/ws/lib/limiter.js"(exports, module) {
    "use strict";
    var kDone = Symbol("kDone");
    var kRun = Symbol("kRun");
    var Limiter = class {
      constructor(concurrency) {
        this[kDone] = () => {
          this.pending--;
          this[kRun]();
        };
        this.concurrency = concurrency || Infinity;
        this.jobs = [];
        this.pending = 0;
      }
      add(job) {
        this.jobs.push(job);
        this[kRun]();
      }
      [kRun]() {
        if (this.pending === this.concurrency)
          return;
        if (this.jobs.length) {
          const job = this.jobs.shift();
          this.pending++;
          job(this[kDone]);
        }
      }
    };
    module.exports = Limiter;
  }
});

// node_modules/ws/lib/permessage-deflate.js
var require_permessage_deflate = __commonJS({
  "node_modules/ws/lib/permessage-deflate.js"(exports, module) {
    "use strict";
    var zlib = __require("zlib");
    var bufferUtil = require_buffer_util();
    var Limiter = require_limiter();
    var { kStatusCode } = require_constants();
    var TRAILER = Buffer.from([0, 0, 255, 255]);
    var kPerMessageDeflate = Symbol("permessage-deflate");
    var kTotalLength = Symbol("total-length");
    var kCallback = Symbol("callback");
    var kBuffers = Symbol("buffers");
    var kError = Symbol("error");
    var zlibLimiter;
    var PerMessageDeflate = class {
      constructor(options, isServer, maxPayload) {
        this._maxPayload = maxPayload | 0;
        this._options = options || {};
        this._threshold = this._options.threshold !== void 0 ? this._options.threshold : 1024;
        this._isServer = !!isServer;
        this._deflate = null;
        this._inflate = null;
        this.params = null;
        if (!zlibLimiter) {
          const concurrency = this._options.concurrencyLimit !== void 0 ? this._options.concurrencyLimit : 10;
          zlibLimiter = new Limiter(concurrency);
        }
      }
      static get extensionName() {
        return "permessage-deflate";
      }
      offer() {
        const params = {};
        if (this._options.serverNoContextTakeover) {
          params.server_no_context_takeover = true;
        }
        if (this._options.clientNoContextTakeover) {
          params.client_no_context_takeover = true;
        }
        if (this._options.serverMaxWindowBits) {
          params.server_max_window_bits = this._options.serverMaxWindowBits;
        }
        if (this._options.clientMaxWindowBits) {
          params.client_max_window_bits = this._options.clientMaxWindowBits;
        } else if (this._options.clientMaxWindowBits == null) {
          params.client_max_window_bits = true;
        }
        return params;
      }
      accept(configurations) {
        configurations = this.normalizeParams(configurations);
        this.params = this._isServer ? this.acceptAsServer(configurations) : this.acceptAsClient(configurations);
        return this.params;
      }
      cleanup() {
        if (this._inflate) {
          this._inflate.close();
          this._inflate = null;
        }
        if (this._deflate) {
          const callback = this._deflate[kCallback];
          this._deflate.close();
          this._deflate = null;
          if (callback) {
            callback(
              new Error(
                "The deflate stream was closed while data was being processed"
              )
            );
          }
        }
      }
      acceptAsServer(offers) {
        const opts = this._options;
        const accepted = offers.find((params) => {
          if (opts.serverNoContextTakeover === false && params.server_no_context_takeover || params.server_max_window_bits && (opts.serverMaxWindowBits === false || typeof opts.serverMaxWindowBits === "number" && opts.serverMaxWindowBits > params.server_max_window_bits) || typeof opts.clientMaxWindowBits === "number" && !params.client_max_window_bits) {
            return false;
          }
          return true;
        });
        if (!accepted) {
          throw new Error("None of the extension offers can be accepted");
        }
        if (opts.serverNoContextTakeover) {
          accepted.server_no_context_takeover = true;
        }
        if (opts.clientNoContextTakeover) {
          accepted.client_no_context_takeover = true;
        }
        if (typeof opts.serverMaxWindowBits === "number") {
          accepted.server_max_window_bits = opts.serverMaxWindowBits;
        }
        if (typeof opts.clientMaxWindowBits === "number") {
          accepted.client_max_window_bits = opts.clientMaxWindowBits;
        } else if (accepted.client_max_window_bits === true || opts.clientMaxWindowBits === false) {
          delete accepted.client_max_window_bits;
        }
        return accepted;
      }
      acceptAsClient(response) {
        const params = response[0];
        if (this._options.clientNoContextTakeover === false && params.client_no_context_takeover) {
          throw new Error('Unexpected parameter "client_no_context_takeover"');
        }
        if (!params.client_max_window_bits) {
          if (typeof this._options.clientMaxWindowBits === "number") {
            params.client_max_window_bits = this._options.clientMaxWindowBits;
          }
        } else if (this._options.clientMaxWindowBits === false || typeof this._options.clientMaxWindowBits === "number" && params.client_max_window_bits > this._options.clientMaxWindowBits) {
          throw new Error(
            'Unexpected or invalid parameter "client_max_window_bits"'
          );
        }
        return params;
      }
      normalizeParams(configurations) {
        configurations.forEach((params) => {
          Object.keys(params).forEach((key) => {
            let value = params[key];
            if (value.length > 1) {
              throw new Error(`Parameter "${key}" must have only a single value`);
            }
            value = value[0];
            if (key === "client_max_window_bits") {
              if (value !== true) {
                const num = +value;
                if (!Number.isInteger(num) || num < 8 || num > 15) {
                  throw new TypeError(
                    `Invalid value for parameter "${key}": ${value}`
                  );
                }
                value = num;
              } else if (!this._isServer) {
                throw new TypeError(
                  `Invalid value for parameter "${key}": ${value}`
                );
              }
            } else if (key === "server_max_window_bits") {
              const num = +value;
              if (!Number.isInteger(num) || num < 8 || num > 15) {
                throw new TypeError(
                  `Invalid value for parameter "${key}": ${value}`
                );
              }
              value = num;
            } else if (key === "client_no_context_takeover" || key === "server_no_context_takeover") {
              if (value !== true) {
                throw new TypeError(
                  `Invalid value for parameter "${key}": ${value}`
                );
              }
            } else {
              throw new Error(`Unknown parameter "${key}"`);
            }
            params[key] = value;
          });
        });
        return configurations;
      }
      decompress(data, fin, callback) {
        zlibLimiter.add((done) => {
          this._decompress(data, fin, (err, result) => {
            done();
            callback(err, result);
          });
        });
      }
      compress(data, fin, callback) {
        zlibLimiter.add((done) => {
          this._compress(data, fin, (err, result) => {
            done();
            callback(err, result);
          });
        });
      }
      _decompress(data, fin, callback) {
        const endpoint = this._isServer ? "client" : "server";
        if (!this._inflate) {
          const key = `${endpoint}_max_window_bits`;
          const windowBits = typeof this.params[key] !== "number" ? zlib.Z_DEFAULT_WINDOWBITS : this.params[key];
          this._inflate = zlib.createInflateRaw({
            ...this._options.zlibInflateOptions,
            windowBits
          });
          this._inflate[kPerMessageDeflate] = this;
          this._inflate[kTotalLength] = 0;
          this._inflate[kBuffers] = [];
          this._inflate.on("error", inflateOnError);
          this._inflate.on("data", inflateOnData);
        }
        this._inflate[kCallback] = callback;
        this._inflate.write(data);
        if (fin)
          this._inflate.write(TRAILER);
        this._inflate.flush(() => {
          const err = this._inflate[kError];
          if (err) {
            this._inflate.close();
            this._inflate = null;
            callback(err);
            return;
          }
          const data2 = bufferUtil.concat(
            this._inflate[kBuffers],
            this._inflate[kTotalLength]
          );
          if (this._inflate._readableState.endEmitted) {
            this._inflate.close();
            this._inflate = null;
          } else {
            this._inflate[kTotalLength] = 0;
            this._inflate[kBuffers] = [];
            if (fin && this.params[`${endpoint}_no_context_takeover`]) {
              this._inflate.reset();
            }
          }
          callback(null, data2);
        });
      }
      _compress(data, fin, callback) {
        const endpoint = this._isServer ? "server" : "client";
        if (!this._deflate) {
          const key = `${endpoint}_max_window_bits`;
          const windowBits = typeof this.params[key] !== "number" ? zlib.Z_DEFAULT_WINDOWBITS : this.params[key];
          this._deflate = zlib.createDeflateRaw({
            ...this._options.zlibDeflateOptions,
            windowBits
          });
          this._deflate[kTotalLength] = 0;
          this._deflate[kBuffers] = [];
          this._deflate.on("data", deflateOnData);
        }
        this._deflate[kCallback] = callback;
        this._deflate.write(data);
        this._deflate.flush(zlib.Z_SYNC_FLUSH, () => {
          if (!this._deflate) {
            return;
          }
          let data2 = bufferUtil.concat(
            this._deflate[kBuffers],
            this._deflate[kTotalLength]
          );
          if (fin)
            data2 = data2.slice(0, data2.length - 4);
          this._deflate[kCallback] = null;
          this._deflate[kTotalLength] = 0;
          this._deflate[kBuffers] = [];
          if (fin && this.params[`${endpoint}_no_context_takeover`]) {
            this._deflate.reset();
          }
          callback(null, data2);
        });
      }
    };
    module.exports = PerMessageDeflate;
    function deflateOnData(chunk) {
      this[kBuffers].push(chunk);
      this[kTotalLength] += chunk.length;
    }
    function inflateOnData(chunk) {
      this[kTotalLength] += chunk.length;
      if (this[kPerMessageDeflate]._maxPayload < 1 || this[kTotalLength] <= this[kPerMessageDeflate]._maxPayload) {
        this[kBuffers].push(chunk);
        return;
      }
      this[kError] = new RangeError("Max payload size exceeded");
      this[kError].code = "WS_ERR_UNSUPPORTED_MESSAGE_LENGTH";
      this[kError][kStatusCode] = 1009;
      this.removeListener("data", inflateOnData);
      this.reset();
    }
    function inflateOnError(err) {
      this[kPerMessageDeflate]._inflate = null;
      err[kStatusCode] = 1007;
      this[kCallback](err);
    }
  }
});

// node_modules/ws/lib/validation.js
var require_validation = __commonJS({
  "node_modules/ws/lib/validation.js"(exports, module) {
    "use strict";
    var tokenChars = [
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      1,
      0,
      1,
      1,
      1,
      1,
      1,
      0,
      0,
      1,
      1,
      0,
      1,
      1,
      0,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      0,
      0,
      0,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      0,
      1,
      0,
      1,
      0
    ];
    function isValidStatusCode(code4) {
      return code4 >= 1e3 && code4 <= 1014 && code4 !== 1004 && code4 !== 1005 && code4 !== 1006 || code4 >= 3e3 && code4 <= 4999;
    }
    function _isValidUTF8(buf) {
      const len = buf.length;
      let i = 0;
      while (i < len) {
        if ((buf[i] & 128) === 0) {
          i++;
        } else if ((buf[i] & 224) === 192) {
          if (i + 1 === len || (buf[i + 1] & 192) !== 128 || (buf[i] & 254) === 192) {
            return false;
          }
          i += 2;
        } else if ((buf[i] & 240) === 224) {
          if (i + 2 >= len || (buf[i + 1] & 192) !== 128 || (buf[i + 2] & 192) !== 128 || buf[i] === 224 && (buf[i + 1] & 224) === 128 || buf[i] === 237 && (buf[i + 1] & 224) === 160) {
            return false;
          }
          i += 3;
        } else if ((buf[i] & 248) === 240) {
          if (i + 3 >= len || (buf[i + 1] & 192) !== 128 || (buf[i + 2] & 192) !== 128 || (buf[i + 3] & 192) !== 128 || buf[i] === 240 && (buf[i + 1] & 240) === 128 || buf[i] === 244 && buf[i + 1] > 143 || buf[i] > 244) {
            return false;
          }
          i += 4;
        } else {
          return false;
        }
      }
      return true;
    }
    module.exports = {
      isValidStatusCode,
      isValidUTF8: _isValidUTF8,
      tokenChars
    };
    if (!process.env.WS_NO_UTF_8_VALIDATE) {
      try {
        const isValidUTF8 = __require("utf-8-validate");
        module.exports.isValidUTF8 = function(buf) {
          return buf.length < 150 ? _isValidUTF8(buf) : isValidUTF8(buf);
        };
      } catch (e) {
      }
    }
  }
});

// node_modules/ws/lib/receiver.js
var require_receiver = __commonJS({
  "node_modules/ws/lib/receiver.js"(exports, module) {
    "use strict";
    var { Writable } = __require("stream");
    var PerMessageDeflate = require_permessage_deflate();
    var {
      BINARY_TYPES,
      EMPTY_BUFFER,
      kStatusCode,
      kWebSocket
    } = require_constants();
    var { concat, toArrayBuffer, unmask } = require_buffer_util();
    var { isValidStatusCode, isValidUTF8 } = require_validation();
    var GET_INFO = 0;
    var GET_PAYLOAD_LENGTH_16 = 1;
    var GET_PAYLOAD_LENGTH_64 = 2;
    var GET_MASK = 3;
    var GET_DATA = 4;
    var INFLATING = 5;
    var Receiver = class extends Writable {
      constructor(options = {}) {
        super();
        this._binaryType = options.binaryType || BINARY_TYPES[0];
        this._extensions = options.extensions || {};
        this._isServer = !!options.isServer;
        this._maxPayload = options.maxPayload | 0;
        this._skipUTF8Validation = !!options.skipUTF8Validation;
        this[kWebSocket] = void 0;
        this._bufferedBytes = 0;
        this._buffers = [];
        this._compressed = false;
        this._payloadLength = 0;
        this._mask = void 0;
        this._fragmented = 0;
        this._masked = false;
        this._fin = false;
        this._opcode = 0;
        this._totalPayloadLength = 0;
        this._messageLength = 0;
        this._fragments = [];
        this._state = GET_INFO;
        this._loop = false;
      }
      _write(chunk, encoding, cb) {
        if (this._opcode === 8 && this._state == GET_INFO)
          return cb();
        this._bufferedBytes += chunk.length;
        this._buffers.push(chunk);
        this.startLoop(cb);
      }
      consume(n) {
        this._bufferedBytes -= n;
        if (n === this._buffers[0].length)
          return this._buffers.shift();
        if (n < this._buffers[0].length) {
          const buf = this._buffers[0];
          this._buffers[0] = buf.slice(n);
          return buf.slice(0, n);
        }
        const dst = Buffer.allocUnsafe(n);
        do {
          const buf = this._buffers[0];
          const offset = dst.length - n;
          if (n >= buf.length) {
            dst.set(this._buffers.shift(), offset);
          } else {
            dst.set(new Uint8Array(buf.buffer, buf.byteOffset, n), offset);
            this._buffers[0] = buf.slice(n);
          }
          n -= buf.length;
        } while (n > 0);
        return dst;
      }
      startLoop(cb) {
        let err;
        this._loop = true;
        do {
          switch (this._state) {
            case GET_INFO:
              err = this.getInfo();
              break;
            case GET_PAYLOAD_LENGTH_16:
              err = this.getPayloadLength16();
              break;
            case GET_PAYLOAD_LENGTH_64:
              err = this.getPayloadLength64();
              break;
            case GET_MASK:
              this.getMask();
              break;
            case GET_DATA:
              err = this.getData(cb);
              break;
            default:
              this._loop = false;
              return;
          }
        } while (this._loop);
        cb(err);
      }
      getInfo() {
        if (this._bufferedBytes < 2) {
          this._loop = false;
          return;
        }
        const buf = this.consume(2);
        if ((buf[0] & 48) !== 0) {
          this._loop = false;
          return error(
            RangeError,
            "RSV2 and RSV3 must be clear",
            true,
            1002,
            "WS_ERR_UNEXPECTED_RSV_2_3"
          );
        }
        const compressed = (buf[0] & 64) === 64;
        if (compressed && !this._extensions[PerMessageDeflate.extensionName]) {
          this._loop = false;
          return error(
            RangeError,
            "RSV1 must be clear",
            true,
            1002,
            "WS_ERR_UNEXPECTED_RSV_1"
          );
        }
        this._fin = (buf[0] & 128) === 128;
        this._opcode = buf[0] & 15;
        this._payloadLength = buf[1] & 127;
        if (this._opcode === 0) {
          if (compressed) {
            this._loop = false;
            return error(
              RangeError,
              "RSV1 must be clear",
              true,
              1002,
              "WS_ERR_UNEXPECTED_RSV_1"
            );
          }
          if (!this._fragmented) {
            this._loop = false;
            return error(
              RangeError,
              "invalid opcode 0",
              true,
              1002,
              "WS_ERR_INVALID_OPCODE"
            );
          }
          this._opcode = this._fragmented;
        } else if (this._opcode === 1 || this._opcode === 2) {
          if (this._fragmented) {
            this._loop = false;
            return error(
              RangeError,
              `invalid opcode ${this._opcode}`,
              true,
              1002,
              "WS_ERR_INVALID_OPCODE"
            );
          }
          this._compressed = compressed;
        } else if (this._opcode > 7 && this._opcode < 11) {
          if (!this._fin) {
            this._loop = false;
            return error(
              RangeError,
              "FIN must be set",
              true,
              1002,
              "WS_ERR_EXPECTED_FIN"
            );
          }
          if (compressed) {
            this._loop = false;
            return error(
              RangeError,
              "RSV1 must be clear",
              true,
              1002,
              "WS_ERR_UNEXPECTED_RSV_1"
            );
          }
          if (this._payloadLength > 125) {
            this._loop = false;
            return error(
              RangeError,
              `invalid payload length ${this._payloadLength}`,
              true,
              1002,
              "WS_ERR_INVALID_CONTROL_PAYLOAD_LENGTH"
            );
          }
        } else {
          this._loop = false;
          return error(
            RangeError,
            `invalid opcode ${this._opcode}`,
            true,
            1002,
            "WS_ERR_INVALID_OPCODE"
          );
        }
        if (!this._fin && !this._fragmented)
          this._fragmented = this._opcode;
        this._masked = (buf[1] & 128) === 128;
        if (this._isServer) {
          if (!this._masked) {
            this._loop = false;
            return error(
              RangeError,
              "MASK must be set",
              true,
              1002,
              "WS_ERR_EXPECTED_MASK"
            );
          }
        } else if (this._masked) {
          this._loop = false;
          return error(
            RangeError,
            "MASK must be clear",
            true,
            1002,
            "WS_ERR_UNEXPECTED_MASK"
          );
        }
        if (this._payloadLength === 126)
          this._state = GET_PAYLOAD_LENGTH_16;
        else if (this._payloadLength === 127)
          this._state = GET_PAYLOAD_LENGTH_64;
        else
          return this.haveLength();
      }
      getPayloadLength16() {
        if (this._bufferedBytes < 2) {
          this._loop = false;
          return;
        }
        this._payloadLength = this.consume(2).readUInt16BE(0);
        return this.haveLength();
      }
      getPayloadLength64() {
        if (this._bufferedBytes < 8) {
          this._loop = false;
          return;
        }
        const buf = this.consume(8);
        const num = buf.readUInt32BE(0);
        if (num > Math.pow(2, 53 - 32) - 1) {
          this._loop = false;
          return error(
            RangeError,
            "Unsupported WebSocket frame: payload length > 2^53 - 1",
            false,
            1009,
            "WS_ERR_UNSUPPORTED_DATA_PAYLOAD_LENGTH"
          );
        }
        this._payloadLength = num * Math.pow(2, 32) + buf.readUInt32BE(4);
        return this.haveLength();
      }
      haveLength() {
        if (this._payloadLength && this._opcode < 8) {
          this._totalPayloadLength += this._payloadLength;
          if (this._totalPayloadLength > this._maxPayload && this._maxPayload > 0) {
            this._loop = false;
            return error(
              RangeError,
              "Max payload size exceeded",
              false,
              1009,
              "WS_ERR_UNSUPPORTED_MESSAGE_LENGTH"
            );
          }
        }
        if (this._masked)
          this._state = GET_MASK;
        else
          this._state = GET_DATA;
      }
      getMask() {
        if (this._bufferedBytes < 4) {
          this._loop = false;
          return;
        }
        this._mask = this.consume(4);
        this._state = GET_DATA;
      }
      getData(cb) {
        let data = EMPTY_BUFFER;
        if (this._payloadLength) {
          if (this._bufferedBytes < this._payloadLength) {
            this._loop = false;
            return;
          }
          data = this.consume(this._payloadLength);
          if (this._masked && (this._mask[0] | this._mask[1] | this._mask[2] | this._mask[3]) !== 0) {
            unmask(data, this._mask);
          }
        }
        if (this._opcode > 7)
          return this.controlMessage(data);
        if (this._compressed) {
          this._state = INFLATING;
          this.decompress(data, cb);
          return;
        }
        if (data.length) {
          this._messageLength = this._totalPayloadLength;
          this._fragments.push(data);
        }
        return this.dataMessage();
      }
      decompress(data, cb) {
        const perMessageDeflate = this._extensions[PerMessageDeflate.extensionName];
        perMessageDeflate.decompress(data, this._fin, (err, buf) => {
          if (err)
            return cb(err);
          if (buf.length) {
            this._messageLength += buf.length;
            if (this._messageLength > this._maxPayload && this._maxPayload > 0) {
              return cb(
                error(
                  RangeError,
                  "Max payload size exceeded",
                  false,
                  1009,
                  "WS_ERR_UNSUPPORTED_MESSAGE_LENGTH"
                )
              );
            }
            this._fragments.push(buf);
          }
          const er = this.dataMessage();
          if (er)
            return cb(er);
          this.startLoop(cb);
        });
      }
      dataMessage() {
        if (this._fin) {
          const messageLength = this._messageLength;
          const fragments = this._fragments;
          this._totalPayloadLength = 0;
          this._messageLength = 0;
          this._fragmented = 0;
          this._fragments = [];
          if (this._opcode === 2) {
            let data;
            if (this._binaryType === "nodebuffer") {
              data = concat(fragments, messageLength);
            } else if (this._binaryType === "arraybuffer") {
              data = toArrayBuffer(concat(fragments, messageLength));
            } else {
              data = fragments;
            }
            this.emit("message", data, true);
          } else {
            const buf = concat(fragments, messageLength);
            if (!this._skipUTF8Validation && !isValidUTF8(buf)) {
              this._loop = false;
              return error(
                Error,
                "invalid UTF-8 sequence",
                true,
                1007,
                "WS_ERR_INVALID_UTF8"
              );
            }
            this.emit("message", buf, false);
          }
        }
        this._state = GET_INFO;
      }
      controlMessage(data) {
        if (this._opcode === 8) {
          this._loop = false;
          if (data.length === 0) {
            this.emit("conclude", 1005, EMPTY_BUFFER);
            this.end();
          } else if (data.length === 1) {
            return error(
              RangeError,
              "invalid payload length 1",
              true,
              1002,
              "WS_ERR_INVALID_CONTROL_PAYLOAD_LENGTH"
            );
          } else {
            const code4 = data.readUInt16BE(0);
            if (!isValidStatusCode(code4)) {
              return error(
                RangeError,
                `invalid status code ${code4}`,
                true,
                1002,
                "WS_ERR_INVALID_CLOSE_CODE"
              );
            }
            const buf = data.slice(2);
            if (!this._skipUTF8Validation && !isValidUTF8(buf)) {
              return error(
                Error,
                "invalid UTF-8 sequence",
                true,
                1007,
                "WS_ERR_INVALID_UTF8"
              );
            }
            this.emit("conclude", code4, buf);
            this.end();
          }
        } else if (this._opcode === 9) {
          this.emit("ping", data);
        } else {
          this.emit("pong", data);
        }
        this._state = GET_INFO;
      }
    };
    module.exports = Receiver;
    function error(ErrorCtor, message, prefix, statusCode, errorCode) {
      const err = new ErrorCtor(
        prefix ? `Invalid WebSocket frame: ${message}` : message
      );
      Error.captureStackTrace(err, error);
      err.code = errorCode;
      err[kStatusCode] = statusCode;
      return err;
    }
  }
});

// node_modules/ws/lib/sender.js
var require_sender = __commonJS({
  "node_modules/ws/lib/sender.js"(exports, module) {
    "use strict";
    var net = __require("net");
    var tls = __require("tls");
    var { randomFillSync } = __require("crypto");
    var PerMessageDeflate = require_permessage_deflate();
    var { EMPTY_BUFFER } = require_constants();
    var { isValidStatusCode } = require_validation();
    var { mask: applyMask, toBuffer } = require_buffer_util();
    var kByteLength = Symbol("kByteLength");
    var maskBuffer = Buffer.alloc(4);
    var Sender = class {
      constructor(socket, extensions, generateMask) {
        this._extensions = extensions || {};
        if (generateMask) {
          this._generateMask = generateMask;
          this._maskBuffer = Buffer.alloc(4);
        }
        this._socket = socket;
        this._firstFragment = true;
        this._compress = false;
        this._bufferedBytes = 0;
        this._deflating = false;
        this._queue = [];
      }
      static frame(data, options) {
        let mask;
        let merge = false;
        let offset = 2;
        let skipMasking = false;
        if (options.mask) {
          mask = options.maskBuffer || maskBuffer;
          if (options.generateMask) {
            options.generateMask(mask);
          } else {
            randomFillSync(mask, 0, 4);
          }
          skipMasking = (mask[0] | mask[1] | mask[2] | mask[3]) === 0;
          offset = 6;
        }
        let dataLength;
        if (typeof data === "string") {
          if ((!options.mask || skipMasking) && options[kByteLength] !== void 0) {
            dataLength = options[kByteLength];
          } else {
            data = Buffer.from(data);
            dataLength = data.length;
          }
        } else {
          dataLength = data.length;
          merge = options.mask && options.readOnly && !skipMasking;
        }
        let payloadLength = dataLength;
        if (dataLength >= 65536) {
          offset += 8;
          payloadLength = 127;
        } else if (dataLength > 125) {
          offset += 2;
          payloadLength = 126;
        }
        const target = Buffer.allocUnsafe(merge ? dataLength + offset : offset);
        target[0] = options.fin ? options.opcode | 128 : options.opcode;
        if (options.rsv1)
          target[0] |= 64;
        target[1] = payloadLength;
        if (payloadLength === 126) {
          target.writeUInt16BE(dataLength, 2);
        } else if (payloadLength === 127) {
          target[2] = target[3] = 0;
          target.writeUIntBE(dataLength, 4, 6);
        }
        if (!options.mask)
          return [target, data];
        target[1] |= 128;
        target[offset - 4] = mask[0];
        target[offset - 3] = mask[1];
        target[offset - 2] = mask[2];
        target[offset - 1] = mask[3];
        if (skipMasking)
          return [target, data];
        if (merge) {
          applyMask(data, mask, target, offset, dataLength);
          return [target];
        }
        applyMask(data, mask, data, 0, dataLength);
        return [target, data];
      }
      close(code4, data, mask, cb) {
        let buf;
        if (code4 === void 0) {
          buf = EMPTY_BUFFER;
        } else if (typeof code4 !== "number" || !isValidStatusCode(code4)) {
          throw new TypeError("First argument must be a valid error code number");
        } else if (data === void 0 || !data.length) {
          buf = Buffer.allocUnsafe(2);
          buf.writeUInt16BE(code4, 0);
        } else {
          const length = Buffer.byteLength(data);
          if (length > 123) {
            throw new RangeError("The message must not be greater than 123 bytes");
          }
          buf = Buffer.allocUnsafe(2 + length);
          buf.writeUInt16BE(code4, 0);
          if (typeof data === "string") {
            buf.write(data, 2);
          } else {
            buf.set(data, 2);
          }
        }
        const options = {
          [kByteLength]: buf.length,
          fin: true,
          generateMask: this._generateMask,
          mask,
          maskBuffer: this._maskBuffer,
          opcode: 8,
          readOnly: false,
          rsv1: false
        };
        if (this._deflating) {
          this.enqueue([this.dispatch, buf, false, options, cb]);
        } else {
          this.sendFrame(Sender.frame(buf, options), cb);
        }
      }
      ping(data, mask, cb) {
        let byteLength;
        let readOnly;
        if (typeof data === "string") {
          byteLength = Buffer.byteLength(data);
          readOnly = false;
        } else {
          data = toBuffer(data);
          byteLength = data.length;
          readOnly = toBuffer.readOnly;
        }
        if (byteLength > 125) {
          throw new RangeError("The data size must not be greater than 125 bytes");
        }
        const options = {
          [kByteLength]: byteLength,
          fin: true,
          generateMask: this._generateMask,
          mask,
          maskBuffer: this._maskBuffer,
          opcode: 9,
          readOnly,
          rsv1: false
        };
        if (this._deflating) {
          this.enqueue([this.dispatch, data, false, options, cb]);
        } else {
          this.sendFrame(Sender.frame(data, options), cb);
        }
      }
      pong(data, mask, cb) {
        let byteLength;
        let readOnly;
        if (typeof data === "string") {
          byteLength = Buffer.byteLength(data);
          readOnly = false;
        } else {
          data = toBuffer(data);
          byteLength = data.length;
          readOnly = toBuffer.readOnly;
        }
        if (byteLength > 125) {
          throw new RangeError("The data size must not be greater than 125 bytes");
        }
        const options = {
          [kByteLength]: byteLength,
          fin: true,
          generateMask: this._generateMask,
          mask,
          maskBuffer: this._maskBuffer,
          opcode: 10,
          readOnly,
          rsv1: false
        };
        if (this._deflating) {
          this.enqueue([this.dispatch, data, false, options, cb]);
        } else {
          this.sendFrame(Sender.frame(data, options), cb);
        }
      }
      send(data, options, cb) {
        const perMessageDeflate = this._extensions[PerMessageDeflate.extensionName];
        let opcode = options.binary ? 2 : 1;
        let rsv1 = options.compress;
        let byteLength;
        let readOnly;
        if (typeof data === "string") {
          byteLength = Buffer.byteLength(data);
          readOnly = false;
        } else {
          data = toBuffer(data);
          byteLength = data.length;
          readOnly = toBuffer.readOnly;
        }
        if (this._firstFragment) {
          this._firstFragment = false;
          if (rsv1 && perMessageDeflate && perMessageDeflate.params[perMessageDeflate._isServer ? "server_no_context_takeover" : "client_no_context_takeover"]) {
            rsv1 = byteLength >= perMessageDeflate._threshold;
          }
          this._compress = rsv1;
        } else {
          rsv1 = false;
          opcode = 0;
        }
        if (options.fin)
          this._firstFragment = true;
        if (perMessageDeflate) {
          const opts = {
            [kByteLength]: byteLength,
            fin: options.fin,
            generateMask: this._generateMask,
            mask: options.mask,
            maskBuffer: this._maskBuffer,
            opcode,
            readOnly,
            rsv1
          };
          if (this._deflating) {
            this.enqueue([this.dispatch, data, this._compress, opts, cb]);
          } else {
            this.dispatch(data, this._compress, opts, cb);
          }
        } else {
          this.sendFrame(
            Sender.frame(data, {
              [kByteLength]: byteLength,
              fin: options.fin,
              generateMask: this._generateMask,
              mask: options.mask,
              maskBuffer: this._maskBuffer,
              opcode,
              readOnly,
              rsv1: false
            }),
            cb
          );
        }
      }
      dispatch(data, compress, options, cb) {
        if (!compress) {
          this.sendFrame(Sender.frame(data, options), cb);
          return;
        }
        const perMessageDeflate = this._extensions[PerMessageDeflate.extensionName];
        this._bufferedBytes += options[kByteLength];
        this._deflating = true;
        perMessageDeflate.compress(data, options.fin, (_, buf) => {
          if (this._socket.destroyed) {
            const err = new Error(
              "The socket was closed while data was being compressed"
            );
            if (typeof cb === "function")
              cb(err);
            for (let i = 0; i < this._queue.length; i++) {
              const params = this._queue[i];
              const callback = params[params.length - 1];
              if (typeof callback === "function")
                callback(err);
            }
            return;
          }
          this._bufferedBytes -= options[kByteLength];
          this._deflating = false;
          options.readOnly = false;
          this.sendFrame(Sender.frame(buf, options), cb);
          this.dequeue();
        });
      }
      dequeue() {
        while (!this._deflating && this._queue.length) {
          const params = this._queue.shift();
          this._bufferedBytes -= params[3][kByteLength];
          Reflect.apply(params[0], this, params.slice(1));
        }
      }
      enqueue(params) {
        this._bufferedBytes += params[3][kByteLength];
        this._queue.push(params);
      }
      sendFrame(list, cb) {
        if (list.length === 2) {
          this._socket.cork();
          this._socket.write(list[0]);
          this._socket.write(list[1], cb);
          this._socket.uncork();
        } else {
          this._socket.write(list[0], cb);
        }
      }
    };
    module.exports = Sender;
  }
});

// node_modules/ws/lib/event-target.js
var require_event_target = __commonJS({
  "node_modules/ws/lib/event-target.js"(exports, module) {
    "use strict";
    var { kForOnEventAttribute, kListener } = require_constants();
    var kCode = Symbol("kCode");
    var kData = Symbol("kData");
    var kError = Symbol("kError");
    var kMessage = Symbol("kMessage");
    var kReason = Symbol("kReason");
    var kTarget = Symbol("kTarget");
    var kType = Symbol("kType");
    var kWasClean = Symbol("kWasClean");
    var Event = class {
      constructor(type) {
        this[kTarget] = null;
        this[kType] = type;
      }
      get target() {
        return this[kTarget];
      }
      get type() {
        return this[kType];
      }
    };
    Object.defineProperty(Event.prototype, "target", { enumerable: true });
    Object.defineProperty(Event.prototype, "type", { enumerable: true });
    var CloseEvent = class extends Event {
      constructor(type, options = {}) {
        super(type);
        this[kCode] = options.code === void 0 ? 0 : options.code;
        this[kReason] = options.reason === void 0 ? "" : options.reason;
        this[kWasClean] = options.wasClean === void 0 ? false : options.wasClean;
      }
      get code() {
        return this[kCode];
      }
      get reason() {
        return this[kReason];
      }
      get wasClean() {
        return this[kWasClean];
      }
    };
    Object.defineProperty(CloseEvent.prototype, "code", { enumerable: true });
    Object.defineProperty(CloseEvent.prototype, "reason", { enumerable: true });
    Object.defineProperty(CloseEvent.prototype, "wasClean", { enumerable: true });
    var ErrorEvent = class extends Event {
      constructor(type, options = {}) {
        super(type);
        this[kError] = options.error === void 0 ? null : options.error;
        this[kMessage] = options.message === void 0 ? "" : options.message;
      }
      get error() {
        return this[kError];
      }
      get message() {
        return this[kMessage];
      }
    };
    Object.defineProperty(ErrorEvent.prototype, "error", { enumerable: true });
    Object.defineProperty(ErrorEvent.prototype, "message", { enumerable: true });
    var MessageEvent = class extends Event {
      constructor(type, options = {}) {
        super(type);
        this[kData] = options.data === void 0 ? null : options.data;
      }
      get data() {
        return this[kData];
      }
    };
    Object.defineProperty(MessageEvent.prototype, "data", { enumerable: true });
    var EventTarget = {
      addEventListener(type, handler, options = {}) {
        for (const listener of this.listeners(type)) {
          if (!options[kForOnEventAttribute] && listener[kListener] === handler && !listener[kForOnEventAttribute]) {
            return;
          }
        }
        let wrapper;
        if (type === "message") {
          wrapper = function onMessage(data, isBinary) {
            const event = new MessageEvent("message", {
              data: isBinary ? data : data.toString()
            });
            event[kTarget] = this;
            callListener(handler, this, event);
          };
        } else if (type === "close") {
          wrapper = function onClose(code4, message) {
            const event = new CloseEvent("close", {
              code: code4,
              reason: message.toString(),
              wasClean: this._closeFrameReceived && this._closeFrameSent
            });
            event[kTarget] = this;
            callListener(handler, this, event);
          };
        } else if (type === "error") {
          wrapper = function onError(error) {
            const event = new ErrorEvent("error", {
              error,
              message: error.message
            });
            event[kTarget] = this;
            callListener(handler, this, event);
          };
        } else if (type === "open") {
          wrapper = function onOpen() {
            const event = new Event("open");
            event[kTarget] = this;
            callListener(handler, this, event);
          };
        } else {
          return;
        }
        wrapper[kForOnEventAttribute] = !!options[kForOnEventAttribute];
        wrapper[kListener] = handler;
        if (options.once) {
          this.once(type, wrapper);
        } else {
          this.on(type, wrapper);
        }
      },
      removeEventListener(type, handler) {
        for (const listener of this.listeners(type)) {
          if (listener[kListener] === handler && !listener[kForOnEventAttribute]) {
            this.removeListener(type, listener);
            break;
          }
        }
      }
    };
    module.exports = {
      CloseEvent,
      ErrorEvent,
      Event,
      EventTarget,
      MessageEvent
    };
    function callListener(listener, thisArg, event) {
      if (typeof listener === "object" && listener.handleEvent) {
        listener.handleEvent.call(listener, event);
      } else {
        listener.call(thisArg, event);
      }
    }
  }
});

// node_modules/ws/lib/extension.js
var require_extension = __commonJS({
  "node_modules/ws/lib/extension.js"(exports, module) {
    "use strict";
    var { tokenChars } = require_validation();
    function push(dest, name, elem) {
      if (dest[name] === void 0)
        dest[name] = [elem];
      else
        dest[name].push(elem);
    }
    function parse2(header) {
      const offers = /* @__PURE__ */ Object.create(null);
      let params = /* @__PURE__ */ Object.create(null);
      let mustUnescape = false;
      let isEscaping = false;
      let inQuotes = false;
      let extensionName;
      let paramName;
      let start = -1;
      let code4 = -1;
      let end = -1;
      let i = 0;
      for (; i < header.length; i++) {
        code4 = header.charCodeAt(i);
        if (extensionName === void 0) {
          if (end === -1 && tokenChars[code4] === 1) {
            if (start === -1)
              start = i;
          } else if (i !== 0 && (code4 === 32 || code4 === 9)) {
            if (end === -1 && start !== -1)
              end = i;
          } else if (code4 === 59 || code4 === 44) {
            if (start === -1) {
              throw new SyntaxError(`Unexpected character at index ${i}`);
            }
            if (end === -1)
              end = i;
            const name = header.slice(start, end);
            if (code4 === 44) {
              push(offers, name, params);
              params = /* @__PURE__ */ Object.create(null);
            } else {
              extensionName = name;
            }
            start = end = -1;
          } else {
            throw new SyntaxError(`Unexpected character at index ${i}`);
          }
        } else if (paramName === void 0) {
          if (end === -1 && tokenChars[code4] === 1) {
            if (start === -1)
              start = i;
          } else if (code4 === 32 || code4 === 9) {
            if (end === -1 && start !== -1)
              end = i;
          } else if (code4 === 59 || code4 === 44) {
            if (start === -1) {
              throw new SyntaxError(`Unexpected character at index ${i}`);
            }
            if (end === -1)
              end = i;
            push(params, header.slice(start, end), true);
            if (code4 === 44) {
              push(offers, extensionName, params);
              params = /* @__PURE__ */ Object.create(null);
              extensionName = void 0;
            }
            start = end = -1;
          } else if (code4 === 61 && start !== -1 && end === -1) {
            paramName = header.slice(start, i);
            start = end = -1;
          } else {
            throw new SyntaxError(`Unexpected character at index ${i}`);
          }
        } else {
          if (isEscaping) {
            if (tokenChars[code4] !== 1) {
              throw new SyntaxError(`Unexpected character at index ${i}`);
            }
            if (start === -1)
              start = i;
            else if (!mustUnescape)
              mustUnescape = true;
            isEscaping = false;
          } else if (inQuotes) {
            if (tokenChars[code4] === 1) {
              if (start === -1)
                start = i;
            } else if (code4 === 34 && start !== -1) {
              inQuotes = false;
              end = i;
            } else if (code4 === 92) {
              isEscaping = true;
            } else {
              throw new SyntaxError(`Unexpected character at index ${i}`);
            }
          } else if (code4 === 34 && header.charCodeAt(i - 1) === 61) {
            inQuotes = true;
          } else if (end === -1 && tokenChars[code4] === 1) {
            if (start === -1)
              start = i;
          } else if (start !== -1 && (code4 === 32 || code4 === 9)) {
            if (end === -1)
              end = i;
          } else if (code4 === 59 || code4 === 44) {
            if (start === -1) {
              throw new SyntaxError(`Unexpected character at index ${i}`);
            }
            if (end === -1)
              end = i;
            let value = header.slice(start, end);
            if (mustUnescape) {
              value = value.replace(/\\/g, "");
              mustUnescape = false;
            }
            push(params, paramName, value);
            if (code4 === 44) {
              push(offers, extensionName, params);
              params = /* @__PURE__ */ Object.create(null);
              extensionName = void 0;
            }
            paramName = void 0;
            start = end = -1;
          } else {
            throw new SyntaxError(`Unexpected character at index ${i}`);
          }
        }
      }
      if (start === -1 || inQuotes || code4 === 32 || code4 === 9) {
        throw new SyntaxError("Unexpected end of input");
      }
      if (end === -1)
        end = i;
      const token = header.slice(start, end);
      if (extensionName === void 0) {
        push(offers, token, params);
      } else {
        if (paramName === void 0) {
          push(params, token, true);
        } else if (mustUnescape) {
          push(params, paramName, token.replace(/\\/g, ""));
        } else {
          push(params, paramName, token);
        }
        push(offers, extensionName, params);
      }
      return offers;
    }
    function format(extensions) {
      return Object.keys(extensions).map((extension) => {
        let configurations = extensions[extension];
        if (!Array.isArray(configurations))
          configurations = [configurations];
        return configurations.map((params) => {
          return [extension].concat(
            Object.keys(params).map((k) => {
              let values = params[k];
              if (!Array.isArray(values))
                values = [values];
              return values.map((v) => v === true ? k : `${k}=${v}`).join("; ");
            })
          ).join("; ");
        }).join(", ");
      }).join(", ");
    }
    module.exports = { format, parse: parse2 };
  }
});

// node_modules/ws/lib/websocket.js
var require_websocket = __commonJS({
  "node_modules/ws/lib/websocket.js"(exports, module) {
    "use strict";
    var EventEmitter = __require("events");
    var https = __require("https");
    var http = __require("http");
    var net = __require("net");
    var tls = __require("tls");
    var { randomBytes: randomBytes2, createHash } = __require("crypto");
    var { Readable } = __require("stream");
    var { URL: URL2 } = __require("url");
    var PerMessageDeflate = require_permessage_deflate();
    var Receiver = require_receiver();
    var Sender = require_sender();
    var {
      BINARY_TYPES,
      EMPTY_BUFFER,
      GUID,
      kForOnEventAttribute,
      kListener,
      kStatusCode,
      kWebSocket,
      NOOP
    } = require_constants();
    var {
      EventTarget: { addEventListener: addEventListener2, removeEventListener }
    } = require_event_target();
    var { format, parse: parse2 } = require_extension();
    var { toBuffer } = require_buffer_util();
    var closeTimeout = 30 * 1e3;
    var kAborted = Symbol("kAborted");
    var protocolVersions = [8, 13];
    var readyStates = ["CONNECTING", "OPEN", "CLOSING", "CLOSED"];
    var subprotocolRegex = /^[!#$%&'*+\-.0-9A-Z^_`|a-z~]+$/;
    var WebSocket = class extends EventEmitter {
      constructor(address, protocols, options) {
        super();
        this._binaryType = BINARY_TYPES[0];
        this._closeCode = 1006;
        this._closeFrameReceived = false;
        this._closeFrameSent = false;
        this._closeMessage = EMPTY_BUFFER;
        this._closeTimer = null;
        this._extensions = {};
        this._paused = false;
        this._protocol = "";
        this._readyState = WebSocket.CONNECTING;
        this._receiver = null;
        this._sender = null;
        this._socket = null;
        if (address !== null) {
          this._bufferedAmount = 0;
          this._isServer = false;
          this._redirects = 0;
          if (protocols === void 0) {
            protocols = [];
          } else if (!Array.isArray(protocols)) {
            if (typeof protocols === "object" && protocols !== null) {
              options = protocols;
              protocols = [];
            } else {
              protocols = [protocols];
            }
          }
          initAsClient(this, address, protocols, options);
        } else {
          this._isServer = true;
        }
      }
      get binaryType() {
        return this._binaryType;
      }
      set binaryType(type) {
        if (!BINARY_TYPES.includes(type))
          return;
        this._binaryType = type;
        if (this._receiver)
          this._receiver._binaryType = type;
      }
      get bufferedAmount() {
        if (!this._socket)
          return this._bufferedAmount;
        return this._socket._writableState.length + this._sender._bufferedBytes;
      }
      get extensions() {
        return Object.keys(this._extensions).join();
      }
      get isPaused() {
        return this._paused;
      }
      get onclose() {
        return null;
      }
      get onerror() {
        return null;
      }
      get onopen() {
        return null;
      }
      get onmessage() {
        return null;
      }
      get protocol() {
        return this._protocol;
      }
      get readyState() {
        return this._readyState;
      }
      get url() {
        return this._url;
      }
      setSocket(socket, head, options) {
        const receiver = new Receiver({
          binaryType: this.binaryType,
          extensions: this._extensions,
          isServer: this._isServer,
          maxPayload: options.maxPayload,
          skipUTF8Validation: options.skipUTF8Validation
        });
        this._sender = new Sender(socket, this._extensions, options.generateMask);
        this._receiver = receiver;
        this._socket = socket;
        receiver[kWebSocket] = this;
        socket[kWebSocket] = this;
        receiver.on("conclude", receiverOnConclude);
        receiver.on("drain", receiverOnDrain);
        receiver.on("error", receiverOnError);
        receiver.on("message", receiverOnMessage);
        receiver.on("ping", receiverOnPing);
        receiver.on("pong", receiverOnPong);
        socket.setTimeout(0);
        socket.setNoDelay();
        if (head.length > 0)
          socket.unshift(head);
        socket.on("close", socketOnClose);
        socket.on("data", socketOnData);
        socket.on("end", socketOnEnd);
        socket.on("error", socketOnError);
        this._readyState = WebSocket.OPEN;
        this.emit("open");
      }
      emitClose() {
        if (!this._socket) {
          this._readyState = WebSocket.CLOSED;
          this.emit("close", this._closeCode, this._closeMessage);
          return;
        }
        if (this._extensions[PerMessageDeflate.extensionName]) {
          this._extensions[PerMessageDeflate.extensionName].cleanup();
        }
        this._receiver.removeAllListeners();
        this._readyState = WebSocket.CLOSED;
        this.emit("close", this._closeCode, this._closeMessage);
      }
      close(code4, data) {
        if (this.readyState === WebSocket.CLOSED)
          return;
        if (this.readyState === WebSocket.CONNECTING) {
          const msg = "WebSocket was closed before the connection was established";
          return abortHandshake(this, this._req, msg);
        }
        if (this.readyState === WebSocket.CLOSING) {
          if (this._closeFrameSent && (this._closeFrameReceived || this._receiver._writableState.errorEmitted)) {
            this._socket.end();
          }
          return;
        }
        this._readyState = WebSocket.CLOSING;
        this._sender.close(code4, data, !this._isServer, (err) => {
          if (err)
            return;
          this._closeFrameSent = true;
          if (this._closeFrameReceived || this._receiver._writableState.errorEmitted) {
            this._socket.end();
          }
        });
        this._closeTimer = setTimeout(
          this._socket.destroy.bind(this._socket),
          closeTimeout
        );
      }
      pause() {
        if (this.readyState === WebSocket.CONNECTING || this.readyState === WebSocket.CLOSED) {
          return;
        }
        this._paused = true;
        this._socket.pause();
      }
      ping(data, mask, cb) {
        if (this.readyState === WebSocket.CONNECTING) {
          throw new Error("WebSocket is not open: readyState 0 (CONNECTING)");
        }
        if (typeof data === "function") {
          cb = data;
          data = mask = void 0;
        } else if (typeof mask === "function") {
          cb = mask;
          mask = void 0;
        }
        if (typeof data === "number")
          data = data.toString();
        if (this.readyState !== WebSocket.OPEN) {
          sendAfterClose(this, data, cb);
          return;
        }
        if (mask === void 0)
          mask = !this._isServer;
        this._sender.ping(data || EMPTY_BUFFER, mask, cb);
      }
      pong(data, mask, cb) {
        if (this.readyState === WebSocket.CONNECTING) {
          throw new Error("WebSocket is not open: readyState 0 (CONNECTING)");
        }
        if (typeof data === "function") {
          cb = data;
          data = mask = void 0;
        } else if (typeof mask === "function") {
          cb = mask;
          mask = void 0;
        }
        if (typeof data === "number")
          data = data.toString();
        if (this.readyState !== WebSocket.OPEN) {
          sendAfterClose(this, data, cb);
          return;
        }
        if (mask === void 0)
          mask = !this._isServer;
        this._sender.pong(data || EMPTY_BUFFER, mask, cb);
      }
      resume() {
        if (this.readyState === WebSocket.CONNECTING || this.readyState === WebSocket.CLOSED) {
          return;
        }
        this._paused = false;
        if (!this._receiver._writableState.needDrain)
          this._socket.resume();
      }
      send(data, options, cb) {
        if (this.readyState === WebSocket.CONNECTING) {
          throw new Error("WebSocket is not open: readyState 0 (CONNECTING)");
        }
        if (typeof options === "function") {
          cb = options;
          options = {};
        }
        if (typeof data === "number")
          data = data.toString();
        if (this.readyState !== WebSocket.OPEN) {
          sendAfterClose(this, data, cb);
          return;
        }
        const opts = {
          binary: typeof data !== "string",
          mask: !this._isServer,
          compress: true,
          fin: true,
          ...options
        };
        if (!this._extensions[PerMessageDeflate.extensionName]) {
          opts.compress = false;
        }
        this._sender.send(data || EMPTY_BUFFER, opts, cb);
      }
      terminate() {
        if (this.readyState === WebSocket.CLOSED)
          return;
        if (this.readyState === WebSocket.CONNECTING) {
          const msg = "WebSocket was closed before the connection was established";
          return abortHandshake(this, this._req, msg);
        }
        if (this._socket) {
          this._readyState = WebSocket.CLOSING;
          this._socket.destroy();
        }
      }
    };
    Object.defineProperty(WebSocket, "CONNECTING", {
      enumerable: true,
      value: readyStates.indexOf("CONNECTING")
    });
    Object.defineProperty(WebSocket.prototype, "CONNECTING", {
      enumerable: true,
      value: readyStates.indexOf("CONNECTING")
    });
    Object.defineProperty(WebSocket, "OPEN", {
      enumerable: true,
      value: readyStates.indexOf("OPEN")
    });
    Object.defineProperty(WebSocket.prototype, "OPEN", {
      enumerable: true,
      value: readyStates.indexOf("OPEN")
    });
    Object.defineProperty(WebSocket, "CLOSING", {
      enumerable: true,
      value: readyStates.indexOf("CLOSING")
    });
    Object.defineProperty(WebSocket.prototype, "CLOSING", {
      enumerable: true,
      value: readyStates.indexOf("CLOSING")
    });
    Object.defineProperty(WebSocket, "CLOSED", {
      enumerable: true,
      value: readyStates.indexOf("CLOSED")
    });
    Object.defineProperty(WebSocket.prototype, "CLOSED", {
      enumerable: true,
      value: readyStates.indexOf("CLOSED")
    });
    [
      "binaryType",
      "bufferedAmount",
      "extensions",
      "isPaused",
      "protocol",
      "readyState",
      "url"
    ].forEach((property) => {
      Object.defineProperty(WebSocket.prototype, property, { enumerable: true });
    });
    ["open", "error", "close", "message"].forEach((method) => {
      Object.defineProperty(WebSocket.prototype, `on${method}`, {
        enumerable: true,
        get() {
          for (const listener of this.listeners(method)) {
            if (listener[kForOnEventAttribute])
              return listener[kListener];
          }
          return null;
        },
        set(handler) {
          for (const listener of this.listeners(method)) {
            if (listener[kForOnEventAttribute]) {
              this.removeListener(method, listener);
              break;
            }
          }
          if (typeof handler !== "function")
            return;
          this.addEventListener(method, handler, {
            [kForOnEventAttribute]: true
          });
        }
      });
    });
    WebSocket.prototype.addEventListener = addEventListener2;
    WebSocket.prototype.removeEventListener = removeEventListener;
    module.exports = WebSocket;
    function initAsClient(websocket, address, protocols, options) {
      const opts = {
        protocolVersion: protocolVersions[1],
        maxPayload: 100 * 1024 * 1024,
        skipUTF8Validation: false,
        perMessageDeflate: true,
        followRedirects: false,
        maxRedirects: 10,
        ...options,
        createConnection: void 0,
        socketPath: void 0,
        hostname: void 0,
        protocol: void 0,
        timeout: void 0,
        method: "GET",
        host: void 0,
        path: void 0,
        port: void 0
      };
      if (!protocolVersions.includes(opts.protocolVersion)) {
        throw new RangeError(
          `Unsupported protocol version: ${opts.protocolVersion} (supported versions: ${protocolVersions.join(", ")})`
        );
      }
      let parsedUrl;
      if (address instanceof URL2) {
        parsedUrl = address;
        websocket._url = address.href;
      } else {
        try {
          parsedUrl = new URL2(address);
        } catch (e) {
          throw new SyntaxError(`Invalid URL: ${address}`);
        }
        websocket._url = address;
      }
      const isSecure = parsedUrl.protocol === "wss:";
      const isIpcUrl = parsedUrl.protocol === "ws+unix:";
      let invalidUrlMessage;
      if (parsedUrl.protocol !== "ws:" && !isSecure && !isIpcUrl) {
        invalidUrlMessage = `The URL's protocol must be one of "ws:", "wss:", or "ws+unix:"`;
      } else if (isIpcUrl && !parsedUrl.pathname) {
        invalidUrlMessage = "The URL's pathname is empty";
      } else if (parsedUrl.hash) {
        invalidUrlMessage = "The URL contains a fragment identifier";
      }
      if (invalidUrlMessage) {
        const err = new SyntaxError(invalidUrlMessage);
        if (websocket._redirects === 0) {
          throw err;
        } else {
          emitErrorAndClose(websocket, err);
          return;
        }
      }
      const defaultPort = isSecure ? 443 : 80;
      const key = randomBytes2(16).toString("base64");
      const request = isSecure ? https.request : http.request;
      const protocolSet = /* @__PURE__ */ new Set();
      let perMessageDeflate;
      opts.createConnection = isSecure ? tlsConnect : netConnect;
      opts.defaultPort = opts.defaultPort || defaultPort;
      opts.port = parsedUrl.port || defaultPort;
      opts.host = parsedUrl.hostname.startsWith("[") ? parsedUrl.hostname.slice(1, -1) : parsedUrl.hostname;
      opts.headers = {
        ...opts.headers,
        "Sec-WebSocket-Version": opts.protocolVersion,
        "Sec-WebSocket-Key": key,
        Connection: "Upgrade",
        Upgrade: "websocket"
      };
      opts.path = parsedUrl.pathname + parsedUrl.search;
      opts.timeout = opts.handshakeTimeout;
      if (opts.perMessageDeflate) {
        perMessageDeflate = new PerMessageDeflate(
          opts.perMessageDeflate !== true ? opts.perMessageDeflate : {},
          false,
          opts.maxPayload
        );
        opts.headers["Sec-WebSocket-Extensions"] = format({
          [PerMessageDeflate.extensionName]: perMessageDeflate.offer()
        });
      }
      if (protocols.length) {
        for (const protocol of protocols) {
          if (typeof protocol !== "string" || !subprotocolRegex.test(protocol) || protocolSet.has(protocol)) {
            throw new SyntaxError(
              "An invalid or duplicated subprotocol was specified"
            );
          }
          protocolSet.add(protocol);
        }
        opts.headers["Sec-WebSocket-Protocol"] = protocols.join(",");
      }
      if (opts.origin) {
        if (opts.protocolVersion < 13) {
          opts.headers["Sec-WebSocket-Origin"] = opts.origin;
        } else {
          opts.headers.Origin = opts.origin;
        }
      }
      if (parsedUrl.username || parsedUrl.password) {
        opts.auth = `${parsedUrl.username}:${parsedUrl.password}`;
      }
      if (isIpcUrl) {
        const parts = opts.path.split(":");
        opts.socketPath = parts[0];
        opts.path = parts[1];
      }
      let req;
      if (opts.followRedirects) {
        if (websocket._redirects === 0) {
          websocket._originalIpc = isIpcUrl;
          websocket._originalSecure = isSecure;
          websocket._originalHostOrSocketPath = isIpcUrl ? opts.socketPath : parsedUrl.host;
          const headers = options && options.headers;
          options = { ...options, headers: {} };
          if (headers) {
            for (const [key2, value] of Object.entries(headers)) {
              options.headers[key2.toLowerCase()] = value;
            }
          }
        } else if (websocket.listenerCount("redirect") === 0) {
          const isSameHost = isIpcUrl ? websocket._originalIpc ? opts.socketPath === websocket._originalHostOrSocketPath : false : websocket._originalIpc ? false : parsedUrl.host === websocket._originalHostOrSocketPath;
          if (!isSameHost || websocket._originalSecure && !isSecure) {
            delete opts.headers.authorization;
            delete opts.headers.cookie;
            if (!isSameHost)
              delete opts.headers.host;
            opts.auth = void 0;
          }
        }
        if (opts.auth && !options.headers.authorization) {
          options.headers.authorization = "Basic " + Buffer.from(opts.auth).toString("base64");
        }
        req = websocket._req = request(opts);
        if (websocket._redirects) {
          websocket.emit("redirect", websocket.url, req);
        }
      } else {
        req = websocket._req = request(opts);
      }
      if (opts.timeout) {
        req.on("timeout", () => {
          abortHandshake(websocket, req, "Opening handshake has timed out");
        });
      }
      req.on("error", (err) => {
        if (req === null || req[kAborted])
          return;
        req = websocket._req = null;
        emitErrorAndClose(websocket, err);
      });
      req.on("response", (res) => {
        const location = res.headers.location;
        const statusCode = res.statusCode;
        if (location && opts.followRedirects && statusCode >= 300 && statusCode < 400) {
          if (++websocket._redirects > opts.maxRedirects) {
            abortHandshake(websocket, req, "Maximum redirects exceeded");
            return;
          }
          req.abort();
          let addr;
          try {
            addr = new URL2(location, address);
          } catch (e) {
            const err = new SyntaxError(`Invalid URL: ${location}`);
            emitErrorAndClose(websocket, err);
            return;
          }
          initAsClient(websocket, addr, protocols, options);
        } else if (!websocket.emit("unexpected-response", req, res)) {
          abortHandshake(
            websocket,
            req,
            `Unexpected server response: ${res.statusCode}`
          );
        }
      });
      req.on("upgrade", (res, socket, head) => {
        websocket.emit("upgrade", res);
        if (websocket.readyState !== WebSocket.CONNECTING)
          return;
        req = websocket._req = null;
        if (res.headers.upgrade.toLowerCase() !== "websocket") {
          abortHandshake(websocket, socket, "Invalid Upgrade header");
          return;
        }
        const digest = createHash("sha1").update(key + GUID).digest("base64");
        if (res.headers["sec-websocket-accept"] !== digest) {
          abortHandshake(websocket, socket, "Invalid Sec-WebSocket-Accept header");
          return;
        }
        const serverProt = res.headers["sec-websocket-protocol"];
        let protError;
        if (serverProt !== void 0) {
          if (!protocolSet.size) {
            protError = "Server sent a subprotocol but none was requested";
          } else if (!protocolSet.has(serverProt)) {
            protError = "Server sent an invalid subprotocol";
          }
        } else if (protocolSet.size) {
          protError = "Server sent no subprotocol";
        }
        if (protError) {
          abortHandshake(websocket, socket, protError);
          return;
        }
        if (serverProt)
          websocket._protocol = serverProt;
        const secWebSocketExtensions = res.headers["sec-websocket-extensions"];
        if (secWebSocketExtensions !== void 0) {
          if (!perMessageDeflate) {
            const message = "Server sent a Sec-WebSocket-Extensions header but no extension was requested";
            abortHandshake(websocket, socket, message);
            return;
          }
          let extensions;
          try {
            extensions = parse2(secWebSocketExtensions);
          } catch (err) {
            const message = "Invalid Sec-WebSocket-Extensions header";
            abortHandshake(websocket, socket, message);
            return;
          }
          const extensionNames = Object.keys(extensions);
          if (extensionNames.length !== 1 || extensionNames[0] !== PerMessageDeflate.extensionName) {
            const message = "Server indicated an extension that was not requested";
            abortHandshake(websocket, socket, message);
            return;
          }
          try {
            perMessageDeflate.accept(extensions[PerMessageDeflate.extensionName]);
          } catch (err) {
            const message = "Invalid Sec-WebSocket-Extensions header";
            abortHandshake(websocket, socket, message);
            return;
          }
          websocket._extensions[PerMessageDeflate.extensionName] = perMessageDeflate;
        }
        websocket.setSocket(socket, head, {
          generateMask: opts.generateMask,
          maxPayload: opts.maxPayload,
          skipUTF8Validation: opts.skipUTF8Validation
        });
      });
      req.end();
    }
    function emitErrorAndClose(websocket, err) {
      websocket._readyState = WebSocket.CLOSING;
      websocket.emit("error", err);
      websocket.emitClose();
    }
    function netConnect(options) {
      options.path = options.socketPath;
      return net.connect(options);
    }
    function tlsConnect(options) {
      options.path = void 0;
      if (!options.servername && options.servername !== "") {
        options.servername = net.isIP(options.host) ? "" : options.host;
      }
      return tls.connect(options);
    }
    function abortHandshake(websocket, stream, message) {
      websocket._readyState = WebSocket.CLOSING;
      const err = new Error(message);
      Error.captureStackTrace(err, abortHandshake);
      if (stream.setHeader) {
        stream[kAborted] = true;
        stream.abort();
        if (stream.socket && !stream.socket.destroyed) {
          stream.socket.destroy();
        }
        process.nextTick(emitErrorAndClose, websocket, err);
      } else {
        stream.destroy(err);
        stream.once("error", websocket.emit.bind(websocket, "error"));
        stream.once("close", websocket.emitClose.bind(websocket));
      }
    }
    function sendAfterClose(websocket, data, cb) {
      if (data) {
        const length = toBuffer(data).length;
        if (websocket._socket)
          websocket._sender._bufferedBytes += length;
        else
          websocket._bufferedAmount += length;
      }
      if (cb) {
        const err = new Error(
          `WebSocket is not open: readyState ${websocket.readyState} (${readyStates[websocket.readyState]})`
        );
        cb(err);
      }
    }
    function receiverOnConclude(code4, reason) {
      const websocket = this[kWebSocket];
      websocket._closeFrameReceived = true;
      websocket._closeMessage = reason;
      websocket._closeCode = code4;
      if (websocket._socket[kWebSocket] === void 0)
        return;
      websocket._socket.removeListener("data", socketOnData);
      process.nextTick(resume, websocket._socket);
      if (code4 === 1005)
        websocket.close();
      else
        websocket.close(code4, reason);
    }
    function receiverOnDrain() {
      const websocket = this[kWebSocket];
      if (!websocket.isPaused)
        websocket._socket.resume();
    }
    function receiverOnError(err) {
      const websocket = this[kWebSocket];
      if (websocket._socket[kWebSocket] !== void 0) {
        websocket._socket.removeListener("data", socketOnData);
        process.nextTick(resume, websocket._socket);
        websocket.close(err[kStatusCode]);
      }
      websocket.emit("error", err);
    }
    function receiverOnFinish() {
      this[kWebSocket].emitClose();
    }
    function receiverOnMessage(data, isBinary) {
      this[kWebSocket].emit("message", data, isBinary);
    }
    function receiverOnPing(data) {
      const websocket = this[kWebSocket];
      websocket.pong(data, !websocket._isServer, NOOP);
      websocket.emit("ping", data);
    }
    function receiverOnPong(data) {
      this[kWebSocket].emit("pong", data);
    }
    function resume(stream) {
      stream.resume();
    }
    function socketOnClose() {
      const websocket = this[kWebSocket];
      this.removeListener("close", socketOnClose);
      this.removeListener("data", socketOnData);
      this.removeListener("end", socketOnEnd);
      websocket._readyState = WebSocket.CLOSING;
      let chunk;
      if (!this._readableState.endEmitted && !websocket._closeFrameReceived && !websocket._receiver._writableState.errorEmitted && (chunk = websocket._socket.read()) !== null) {
        websocket._receiver.write(chunk);
      }
      websocket._receiver.end();
      this[kWebSocket] = void 0;
      clearTimeout(websocket._closeTimer);
      if (websocket._receiver._writableState.finished || websocket._receiver._writableState.errorEmitted) {
        websocket.emitClose();
      } else {
        websocket._receiver.on("error", receiverOnFinish);
        websocket._receiver.on("finish", receiverOnFinish);
      }
    }
    function socketOnData(chunk) {
      if (!this[kWebSocket]._receiver.write(chunk)) {
        this.pause();
      }
    }
    function socketOnEnd() {
      const websocket = this[kWebSocket];
      websocket._readyState = WebSocket.CLOSING;
      websocket._receiver.end();
      this.end();
    }
    function socketOnError() {
      const websocket = this[kWebSocket];
      this.removeListener("error", socketOnError);
      this.on("error", NOOP);
      if (websocket) {
        websocket._readyState = WebSocket.CLOSING;
        this.destroy();
      }
    }
  }
});

// node_modules/ws/lib/stream.js
var require_stream = __commonJS({
  "node_modules/ws/lib/stream.js"(exports, module) {
    "use strict";
    var { Duplex } = __require("stream");
    function emitClose(stream) {
      stream.emit("close");
    }
    function duplexOnEnd() {
      if (!this.destroyed && this._writableState.finished) {
        this.destroy();
      }
    }
    function duplexOnError(err) {
      this.removeListener("error", duplexOnError);
      this.destroy();
      if (this.listenerCount("error") === 0) {
        this.emit("error", err);
      }
    }
    function createWebSocketStream(ws, options) {
      let terminateOnDestroy = true;
      const duplex = new Duplex({
        ...options,
        autoDestroy: false,
        emitClose: false,
        objectMode: false,
        writableObjectMode: false
      });
      ws.on("message", function message(msg, isBinary) {
        const data = !isBinary && duplex._readableState.objectMode ? msg.toString() : msg;
        if (!duplex.push(data))
          ws.pause();
      });
      ws.once("error", function error(err) {
        if (duplex.destroyed)
          return;
        terminateOnDestroy = false;
        duplex.destroy(err);
      });
      ws.once("close", function close() {
        if (duplex.destroyed)
          return;
        duplex.push(null);
      });
      duplex._destroy = function(err, callback) {
        if (ws.readyState === ws.CLOSED) {
          callback(err);
          process.nextTick(emitClose, duplex);
          return;
        }
        let called = false;
        ws.once("error", function error(err2) {
          called = true;
          callback(err2);
        });
        ws.once("close", function close() {
          if (!called)
            callback(err);
          process.nextTick(emitClose, duplex);
        });
        if (terminateOnDestroy)
          ws.terminate();
      };
      duplex._final = function(callback) {
        if (ws.readyState === ws.CONNECTING) {
          ws.once("open", function open() {
            duplex._final(callback);
          });
          return;
        }
        if (ws._socket === null)
          return;
        if (ws._socket._writableState.finished) {
          callback();
          if (duplex._readableState.endEmitted)
            duplex.destroy();
        } else {
          ws._socket.once("finish", function finish() {
            callback();
          });
          ws.close();
        }
      };
      duplex._read = function() {
        if (ws.isPaused)
          ws.resume();
      };
      duplex._write = function(chunk, encoding, callback) {
        if (ws.readyState === ws.CONNECTING) {
          ws.once("open", function open() {
            duplex._write(chunk, encoding, callback);
          });
          return;
        }
        ws.send(chunk, callback);
      };
      duplex.on("end", duplexOnEnd);
      duplex.on("error", duplexOnError);
      return duplex;
    }
    module.exports = createWebSocketStream;
  }
});

// node_modules/ws/lib/subprotocol.js
var require_subprotocol = __commonJS({
  "node_modules/ws/lib/subprotocol.js"(exports, module) {
    "use strict";
    var { tokenChars } = require_validation();
    function parse2(header) {
      const protocols = /* @__PURE__ */ new Set();
      let start = -1;
      let end = -1;
      let i = 0;
      for (i; i < header.length; i++) {
        const code4 = header.charCodeAt(i);
        if (end === -1 && tokenChars[code4] === 1) {
          if (start === -1)
            start = i;
        } else if (i !== 0 && (code4 === 32 || code4 === 9)) {
          if (end === -1 && start !== -1)
            end = i;
        } else if (code4 === 44) {
          if (start === -1) {
            throw new SyntaxError(`Unexpected character at index ${i}`);
          }
          if (end === -1)
            end = i;
          const protocol2 = header.slice(start, end);
          if (protocols.has(protocol2)) {
            throw new SyntaxError(`The "${protocol2}" subprotocol is duplicated`);
          }
          protocols.add(protocol2);
          start = end = -1;
        } else {
          throw new SyntaxError(`Unexpected character at index ${i}`);
        }
      }
      if (start === -1 || end !== -1) {
        throw new SyntaxError("Unexpected end of input");
      }
      const protocol = header.slice(start, i);
      if (protocols.has(protocol)) {
        throw new SyntaxError(`The "${protocol}" subprotocol is duplicated`);
      }
      protocols.add(protocol);
      return protocols;
    }
    module.exports = { parse: parse2 };
  }
});

// node_modules/ws/lib/websocket-server.js
var require_websocket_server = __commonJS({
  "node_modules/ws/lib/websocket-server.js"(exports, module) {
    "use strict";
    var EventEmitter = __require("events");
    var http = __require("http");
    var https = __require("https");
    var net = __require("net");
    var tls = __require("tls");
    var { createHash } = __require("crypto");
    var extension = require_extension();
    var PerMessageDeflate = require_permessage_deflate();
    var subprotocol = require_subprotocol();
    var WebSocket = require_websocket();
    var { GUID, kWebSocket } = require_constants();
    var keyRegex = /^[+/0-9A-Za-z]{22}==$/;
    var RUNNING = 0;
    var CLOSING = 1;
    var CLOSED2 = 2;
    var WebSocketServer = class extends EventEmitter {
      constructor(options, callback) {
        super();
        options = {
          maxPayload: 100 * 1024 * 1024,
          skipUTF8Validation: false,
          perMessageDeflate: false,
          handleProtocols: null,
          clientTracking: true,
          verifyClient: null,
          noServer: false,
          backlog: null,
          server: null,
          host: null,
          path: null,
          port: null,
          WebSocket,
          ...options
        };
        if (options.port == null && !options.server && !options.noServer || options.port != null && (options.server || options.noServer) || options.server && options.noServer) {
          throw new TypeError(
            'One and only one of the "port", "server", or "noServer" options must be specified'
          );
        }
        if (options.port != null) {
          this._server = http.createServer((req, res) => {
            const body = http.STATUS_CODES[426];
            res.writeHead(426, {
              "Content-Length": body.length,
              "Content-Type": "text/plain"
            });
            res.end(body);
          });
          this._server.listen(
            options.port,
            options.host,
            options.backlog,
            callback
          );
        } else if (options.server) {
          this._server = options.server;
        }
        if (this._server) {
          const emitConnection = this.emit.bind(this, "connection");
          this._removeListeners = addListeners(this._server, {
            listening: this.emit.bind(this, "listening"),
            error: this.emit.bind(this, "error"),
            upgrade: (req, socket, head) => {
              this.handleUpgrade(req, socket, head, emitConnection);
            }
          });
        }
        if (options.perMessageDeflate === true)
          options.perMessageDeflate = {};
        if (options.clientTracking) {
          this.clients = /* @__PURE__ */ new Set();
          this._shouldEmitClose = false;
        }
        this.options = options;
        this._state = RUNNING;
      }
      address() {
        if (this.options.noServer) {
          throw new Error('The server is operating in "noServer" mode');
        }
        if (!this._server)
          return null;
        return this._server.address();
      }
      close(cb) {
        if (this._state === CLOSED2) {
          if (cb) {
            this.once("close", () => {
              cb(new Error("The server is not running"));
            });
          }
          process.nextTick(emitClose, this);
          return;
        }
        if (cb)
          this.once("close", cb);
        if (this._state === CLOSING)
          return;
        this._state = CLOSING;
        if (this.options.noServer || this.options.server) {
          if (this._server) {
            this._removeListeners();
            this._removeListeners = this._server = null;
          }
          if (this.clients) {
            if (!this.clients.size) {
              process.nextTick(emitClose, this);
            } else {
              this._shouldEmitClose = true;
            }
          } else {
            process.nextTick(emitClose, this);
          }
        } else {
          const server = this._server;
          this._removeListeners();
          this._removeListeners = this._server = null;
          server.close(() => {
            emitClose(this);
          });
        }
      }
      shouldHandle(req) {
        if (this.options.path) {
          const index = req.url.indexOf("?");
          const pathname = index !== -1 ? req.url.slice(0, index) : req.url;
          if (pathname !== this.options.path)
            return false;
        }
        return true;
      }
      handleUpgrade(req, socket, head, cb) {
        socket.on("error", socketOnError);
        const key = req.headers["sec-websocket-key"];
        const version = +req.headers["sec-websocket-version"];
        if (req.method !== "GET") {
          const message = "Invalid HTTP method";
          abortHandshakeOrEmitwsClientError(this, req, socket, 405, message);
          return;
        }
        if (req.headers.upgrade.toLowerCase() !== "websocket") {
          const message = "Invalid Upgrade header";
          abortHandshakeOrEmitwsClientError(this, req, socket, 400, message);
          return;
        }
        if (!key || !keyRegex.test(key)) {
          const message = "Missing or invalid Sec-WebSocket-Key header";
          abortHandshakeOrEmitwsClientError(this, req, socket, 400, message);
          return;
        }
        if (version !== 8 && version !== 13) {
          const message = "Missing or invalid Sec-WebSocket-Version header";
          abortHandshakeOrEmitwsClientError(this, req, socket, 400, message);
          return;
        }
        if (!this.shouldHandle(req)) {
          abortHandshake(socket, 400);
          return;
        }
        const secWebSocketProtocol = req.headers["sec-websocket-protocol"];
        let protocols = /* @__PURE__ */ new Set();
        if (secWebSocketProtocol !== void 0) {
          try {
            protocols = subprotocol.parse(secWebSocketProtocol);
          } catch (err) {
            const message = "Invalid Sec-WebSocket-Protocol header";
            abortHandshakeOrEmitwsClientError(this, req, socket, 400, message);
            return;
          }
        }
        const secWebSocketExtensions = req.headers["sec-websocket-extensions"];
        const extensions = {};
        if (this.options.perMessageDeflate && secWebSocketExtensions !== void 0) {
          const perMessageDeflate = new PerMessageDeflate(
            this.options.perMessageDeflate,
            true,
            this.options.maxPayload
          );
          try {
            const offers = extension.parse(secWebSocketExtensions);
            if (offers[PerMessageDeflate.extensionName]) {
              perMessageDeflate.accept(offers[PerMessageDeflate.extensionName]);
              extensions[PerMessageDeflate.extensionName] = perMessageDeflate;
            }
          } catch (err) {
            const message = "Invalid or unacceptable Sec-WebSocket-Extensions header";
            abortHandshakeOrEmitwsClientError(this, req, socket, 400, message);
            return;
          }
        }
        if (this.options.verifyClient) {
          const info = {
            origin: req.headers[`${version === 8 ? "sec-websocket-origin" : "origin"}`],
            secure: !!(req.socket.authorized || req.socket.encrypted),
            req
          };
          if (this.options.verifyClient.length === 2) {
            this.options.verifyClient(info, (verified, code4, message, headers) => {
              if (!verified) {
                return abortHandshake(socket, code4 || 401, message, headers);
              }
              this.completeUpgrade(
                extensions,
                key,
                protocols,
                req,
                socket,
                head,
                cb
              );
            });
            return;
          }
          if (!this.options.verifyClient(info))
            return abortHandshake(socket, 401);
        }
        this.completeUpgrade(extensions, key, protocols, req, socket, head, cb);
      }
      completeUpgrade(extensions, key, protocols, req, socket, head, cb) {
        if (!socket.readable || !socket.writable)
          return socket.destroy();
        if (socket[kWebSocket]) {
          throw new Error(
            "server.handleUpgrade() was called more than once with the same socket, possibly due to a misconfiguration"
          );
        }
        if (this._state > RUNNING)
          return abortHandshake(socket, 503);
        const digest = createHash("sha1").update(key + GUID).digest("base64");
        const headers = [
          "HTTP/1.1 101 Switching Protocols",
          "Upgrade: websocket",
          "Connection: Upgrade",
          `Sec-WebSocket-Accept: ${digest}`
        ];
        const ws = new this.options.WebSocket(null);
        if (protocols.size) {
          const protocol = this.options.handleProtocols ? this.options.handleProtocols(protocols, req) : protocols.values().next().value;
          if (protocol) {
            headers.push(`Sec-WebSocket-Protocol: ${protocol}`);
            ws._protocol = protocol;
          }
        }
        if (extensions[PerMessageDeflate.extensionName]) {
          const params = extensions[PerMessageDeflate.extensionName].params;
          const value = extension.format({
            [PerMessageDeflate.extensionName]: [params]
          });
          headers.push(`Sec-WebSocket-Extensions: ${value}`);
          ws._extensions = extensions;
        }
        this.emit("headers", headers, req);
        socket.write(headers.concat("\r\n").join("\r\n"));
        socket.removeListener("error", socketOnError);
        ws.setSocket(socket, head, {
          maxPayload: this.options.maxPayload,
          skipUTF8Validation: this.options.skipUTF8Validation
        });
        if (this.clients) {
          this.clients.add(ws);
          ws.on("close", () => {
            this.clients.delete(ws);
            if (this._shouldEmitClose && !this.clients.size) {
              process.nextTick(emitClose, this);
            }
          });
        }
        cb(ws, req);
      }
    };
    module.exports = WebSocketServer;
    function addListeners(server, map) {
      for (const event of Object.keys(map))
        server.on(event, map[event]);
      return function removeListeners() {
        for (const event of Object.keys(map)) {
          server.removeListener(event, map[event]);
        }
      };
    }
    function emitClose(server) {
      server._state = CLOSED2;
      server.emit("close");
    }
    function socketOnError() {
      this.destroy();
    }
    function abortHandshake(socket, code4, message, headers) {
      message = message || http.STATUS_CODES[code4];
      headers = {
        Connection: "close",
        "Content-Type": "text/html",
        "Content-Length": Buffer.byteLength(message),
        ...headers
      };
      socket.once("finish", socket.destroy);
      socket.end(
        `HTTP/1.1 ${code4} ${http.STATUS_CODES[code4]}\r
` + Object.keys(headers).map((h) => `${h}: ${headers[h]}`).join("\r\n") + "\r\n\r\n" + message
      );
    }
    function abortHandshakeOrEmitwsClientError(server, req, socket, code4, message) {
      if (server.listenerCount("wsClientError")) {
        const err = new Error(message);
        Error.captureStackTrace(err, abortHandshakeOrEmitwsClientError);
        server.emit("wsClientError", err, socket, req);
      } else {
        abortHandshake(socket, code4, message);
      }
    }
  }
});

// node_modules/ws/index.js
var require_ws = __commonJS({
  "node_modules/ws/index.js"(exports, module) {
    "use strict";
    var WebSocket = require_websocket();
    WebSocket.createWebSocketStream = require_stream();
    WebSocket.Server = require_websocket_server();
    WebSocket.Receiver = require_receiver();
    WebSocket.Sender = require_sender();
    WebSocket.WebSocket = WebSocket;
    WebSocket.WebSocketServer = WebSocket.Server;
    module.exports = WebSocket;
  }
});

// node_modules/isomorphic-ws/node.js
var require_node = __commonJS({
  "node_modules/isomorphic-ws/node.js"(exports, module) {
    "use strict";
    module.exports = require_ws();
  }
});

// node_modules/hono/dist/utils/cookie.js
var parse = (cookie) => {
  const pairs = cookie.split(/;\s*/g);
  const parsedCookie = {};
  for (let i = 0, len = pairs.length; i < len; i++) {
    const pair = pairs[i].split(/\s*=\s*([^\s]+)/);
    parsedCookie[pair[0]] = decodeURIComponent(pair[1]);
  }
  return parsedCookie;
};
var serialize = (name, value, opt = {}) => {
  value = encodeURIComponent(value);
  let cookie = `${name}=${value}`;
  if (opt.maxAge) {
    cookie += `; Max-Age=${Math.floor(opt.maxAge)}`;
  }
  if (opt.domain) {
    cookie += "; Domain=" + opt.domain;
  }
  if (opt.path) {
    cookie += "; Path=" + opt.path;
  }
  if (opt.expires) {
    cookie += "; Expires=" + opt.expires.toUTCString();
  }
  if (opt.httpOnly) {
    cookie += "; HttpOnly";
  }
  if (opt.secure) {
    cookie += "; Secure";
  }
  if (opt.sameSite) {
    cookie += `; SameSite=${opt.sameSite}`;
  }
  return cookie;
};

// node_modules/hono/dist/context.js
var Context = class {
  constructor(req, env = {}, executionCtx = void 0, notFoundHandler = () => new Response()) {
    this.error = void 0;
    this._status = 200;
    this._pretty = false;
    this._prettySpace = 2;
    this._executionCtx = executionCtx;
    this.req = req;
    this.env = env;
    this.notFoundHandler = notFoundHandler;
    this.finalized = false;
  }
  get event() {
    if (this._executionCtx instanceof FetchEvent) {
      return this._executionCtx;
    } else {
      throw Error("This context has no FetchEvent");
    }
  }
  get executionCtx() {
    if (this._executionCtx) {
      return this._executionCtx;
    } else {
      throw Error("This context has no ExecutionContext");
    }
  }
  get res() {
    return this._res || (this._res = new Response("404 Not Found", { status: 404 }));
  }
  set res(_res) {
    this._res = _res;
    this.finalized = true;
  }
  header(name, value, options) {
    this._headers || (this._headers = {});
    const key = name.toLowerCase();
    let shouldAppend = false;
    if (options && options.append) {
      const vAlreadySet = this._headers[key];
      if (vAlreadySet && vAlreadySet.length) {
        shouldAppend = true;
      }
    }
    if (shouldAppend) {
      this._headers[key].push(value);
    } else {
      this._headers[key] = [value];
    }
    if (this.finalized) {
      if (shouldAppend) {
        this.res.headers.append(name, value);
      } else {
        this.res.headers.set(name, value);
      }
    }
  }
  status(status) {
    this._status = status;
  }
  set(key, value) {
    this._map || (this._map = {});
    this._map[key] = value;
  }
  get(key) {
    if (!this._map) {
      return void 0;
    }
    return this._map[key];
  }
  pretty(prettyJSON, space = 2) {
    this._pretty = prettyJSON;
    this._prettySpace = space;
  }
  newResponse(data, status, headers = {}) {
    return new Response(data, {
      status,
      headers: this._finalizeHeaders(headers)
    });
  }
  _finalizeHeaders(incomingHeaders) {
    const finalizedHeaders = [];
    const headersKv = this._headers || {};
    if (this._res) {
      this._res.headers.forEach((v, k) => {
        headersKv[k] = [v];
      });
    }
    for (const key of Object.keys(incomingHeaders)) {
      const value = incomingHeaders[key];
      if (typeof value === "string") {
        finalizedHeaders.push([key, value]);
      } else {
        for (const v of value) {
          finalizedHeaders.push([key, v]);
        }
      }
      delete headersKv[key];
    }
    for (const key of Object.keys(headersKv)) {
      for (const value of headersKv[key]) {
        const kv = [key, value];
        finalizedHeaders.push(kv);
      }
    }
    return finalizedHeaders;
  }
  body(data, status = this._status, headers = {}) {
    return this.newResponse(data, status, headers);
  }
  text(text, status = this._status, headers = {}) {
    headers["content-type"] = "text/plain; charset=UTF-8";
    return this.newResponse(text, status, headers);
  }
  json(object, status = this._status, headers = {}) {
    const body = this._pretty ? JSON.stringify(object, null, this._prettySpace) : JSON.stringify(object);
    headers["content-type"] = "application/json; charset=UTF-8";
    return this.newResponse(body, status, headers);
  }
  html(html, status = this._status, headers = {}) {
    headers["content-type"] = "text/html; charset=UTF-8";
    return this.newResponse(html, status, headers);
  }
  redirect(location, status = 302) {
    return this.newResponse(null, status, {
      Location: location
    });
  }
  cookie(name, value, opt) {
    const cookie = serialize(name, value, opt);
    this.header("set-cookie", cookie, { append: true });
  }
  notFound() {
    return this.notFoundHandler(this);
  }
  get runtime() {
    const global = globalThis;
    if (global?.Deno !== void 0) {
      return "deno";
    }
    if (global?.Bun !== void 0) {
      return "bun";
    }
    if (typeof global?.WebSocketPair === "function") {
      return "cloudflare";
    }
    if (global?.fastly !== void 0) {
      return "fastly";
    }
    if (typeof global?.EdgeRuntime === "string") {
      return "vercel";
    }
    if (global?.process?.release?.name === "node") {
      return "node";
    }
    return "other";
  }
};

// node_modules/hono/dist/compose.js
var compose = (middleware, onNotFound, onError) => {
  const middlewareLength = middleware.length;
  return (context, next) => {
    let index = -1;
    return dispatch(0);
    function dispatch(i) {
      if (i <= index) {
        throw new Error("next() called multiple times");
      }
      let handler = middleware[i];
      index = i;
      if (i === middlewareLength && next)
        handler = next;
      let res;
      let isError = false;
      if (!handler) {
        if (context instanceof Context && context.finalized === false && onNotFound) {
          res = onNotFound(context);
        }
      } else {
        try {
          res = handler(context, () => {
            const dispatchRes = dispatch(i + 1);
            return dispatchRes instanceof Promise ? dispatchRes : Promise.resolve(dispatchRes);
          });
        } catch (err) {
          if (err instanceof Error && context instanceof Context && onError) {
            context.error = err;
            res = onError(err, context);
            isError = true;
          } else {
            throw err;
          }
        }
      }
      if (!(res instanceof Promise)) {
        if (res && (context.finalized === false || isError)) {
          context.res = res;
        }
        return context;
      } else {
        return res.then((res2) => {
          if (res2 && context.finalized === false) {
            context.res = res2;
          }
          return context;
        }).catch((err) => {
          if (err instanceof Error && context instanceof Context && onError) {
            context.error = err;
            context.res = onError(err, context);
            return context;
          }
          throw err;
        });
      }
    }
  };
};

// node_modules/hono/dist/utils/body.js
async function parseBody(r) {
  let body = {};
  const contentType = r.headers.get("Content-Type");
  if (contentType && (contentType.startsWith("multipart/form-data") || contentType === "application/x-www-form-urlencoded")) {
    const form = {};
    (await r.formData()).forEach((value, key) => {
      form[key] = value;
    });
    body = form;
  }
  return body;
}

// node_modules/hono/dist/utils/url.js
var splitPath = (path) => {
  const paths = path.split(/\//);
  if (paths[0] === "") {
    paths.shift();
  }
  return paths;
};
var patternCache = {};
var getPattern = (label) => {
  if (label === "*") {
    return "*";
  }
  const match = label.match(/^\:([^\{\}]+)(?:\{(.+)\})?$/);
  if (match) {
    if (!patternCache[label]) {
      if (match[2]) {
        patternCache[label] = [label, match[1], new RegExp("^" + match[2] + "$")];
      } else {
        patternCache[label] = [label, match[1], true];
      }
    }
    return patternCache[label];
  }
  return null;
};
var getPathFromURL = (url, strict = true) => {
  const queryIndex = url.indexOf("?");
  const result = url.substring(url.indexOf("/", 8), queryIndex === -1 ? url.length : queryIndex);
  if (strict === false && result.endsWith("/")) {
    return result.slice(0, -1);
  }
  return result;
};
var getQueryStringFromURL = (url) => {
  const queryIndex = url.indexOf("?");
  const result = queryIndex !== -1 ? url.substring(queryIndex) : "";
  return result;
};
var mergePath = (...paths) => {
  let p = "";
  let endsWithSlash = false;
  for (let path of paths) {
    if (p.endsWith("/")) {
      p = p.slice(0, -1);
      endsWithSlash = true;
    }
    if (!path.startsWith("/")) {
      path = `/${path}`;
    }
    if (path === "/" && endsWithSlash) {
      p = `${p}/`;
    } else if (path !== "/") {
      p = `${p}${path}`;
    }
    if (path === "/" && p === "") {
      p = "/";
    }
  }
  return p;
};
var checkOptionalParameter = (path) => {
  const match = path.match(/(^.+)(\/\:[^\/]+)\?$/);
  if (!match)
    return null;
  const base = match[1];
  const optional = base + match[2];
  return [base, optional];
};

// node_modules/hono/dist/request.js
function extendRequestPrototype() {
  if (!!Request.prototype.param) {
    return;
  }
  Request.prototype.param = function(key) {
    if (this.paramData) {
      if (key) {
        return decodeURIComponent(this.paramData[key]);
      } else {
        const decoded = {};
        for (const [key2, value] of Object.entries(this.paramData)) {
          decoded[key2] = decodeURIComponent(value);
        }
        return decoded;
      }
    }
    return null;
  };
  Request.prototype.header = function(name) {
    if (!this.headerData) {
      this.headerData = {};
      this.headers.forEach((value, key) => {
        this.headerData[key] = value;
      });
    }
    if (name) {
      return this.headerData[name.toLowerCase()];
    } else {
      return this.headerData;
    }
  };
  Request.prototype.query = function(key) {
    const queryString = getQueryStringFromURL(this.url);
    const searchParams = new URLSearchParams(queryString);
    if (!this.queryData) {
      this.queryData = {};
      for (const key2 of searchParams.keys()) {
        this.queryData[key2] = searchParams.get(key2) || "";
      }
    }
    if (key) {
      return this.queryData[key];
    } else {
      return this.queryData;
    }
  };
  Request.prototype.queries = function(key) {
    const queryString = getQueryStringFromURL(this.url);
    const searchParams = new URLSearchParams(queryString);
    if (key) {
      return searchParams.getAll(key);
    } else {
      const result = {};
      for (const key2 of searchParams.keys()) {
        result[key2] = searchParams.getAll(key2);
      }
      return result;
    }
  };
  Request.prototype.cookie = function(key) {
    const cookie = this.headers.get("Cookie") || "";
    const obj = parse(cookie);
    if (key) {
      const value = obj[key];
      return value;
    } else {
      return obj;
    }
  };
  Request.prototype.parseBody = async function() {
    let body;
    if (!this.bodyData) {
      body = await parseBody(this);
      this.bodyData = body;
    } else {
      body = this.bodyData;
    }
    return body;
  };
  Request.prototype.json = async function() {
    let jsonData;
    if (!this.jsonData) {
      jsonData = JSON.parse(await this.text());
      this.jsonData = jsonData;
    } else {
      jsonData = this.jsonData;
    }
    return jsonData;
  };
  Request.prototype.valid = function(data) {
    if (!this.data) {
      this.data = {};
    }
    if (data) {
      this.data = data;
    }
    return this.data;
  };
}

// node_modules/hono/dist/router.js
var METHOD_NAME_ALL = "ALL";
var METHOD_NAME_ALL_LOWERCASE = "all";
var METHODS = ["get", "post", "put", "delete", "head", "options", "patch"];
var UnsupportedPathError = class extends Error {
};

// node_modules/hono/dist/router/reg-exp-router/node.js
var LABEL_REG_EXP_STR = "[^/]+";
var ONLY_WILDCARD_REG_EXP_STR = ".*";
var TAIL_WILDCARD_REG_EXP_STR = "(?:|/.*)";
var PATH_ERROR = Symbol();
function compareKey(a, b) {
  if (a.length === 1) {
    return b.length === 1 ? a < b ? -1 : 1 : -1;
  }
  if (b.length === 1) {
    return 1;
  }
  if (a === ONLY_WILDCARD_REG_EXP_STR || a === TAIL_WILDCARD_REG_EXP_STR) {
    return 1;
  } else if (b === ONLY_WILDCARD_REG_EXP_STR || b === TAIL_WILDCARD_REG_EXP_STR) {
    return -1;
  }
  if (a === LABEL_REG_EXP_STR) {
    return 1;
  } else if (b === LABEL_REG_EXP_STR) {
    return -1;
  }
  return a.length === b.length ? a < b ? -1 : 1 : b.length - a.length;
}
var Node = class {
  constructor() {
    this.children = {};
  }
  insert(tokens, index, paramMap, context) {
    if (tokens.length === 0) {
      if (this.index !== void 0) {
        throw PATH_ERROR;
      }
      this.index = index;
      return;
    }
    const [token, ...restTokens] = tokens;
    const pattern = token === "*" ? restTokens.length === 0 ? ["", "", ONLY_WILDCARD_REG_EXP_STR] : ["", "", LABEL_REG_EXP_STR] : token === "/*" ? ["", "", TAIL_WILDCARD_REG_EXP_STR] : token.match(/^\:([^\{\}]+)(?:\{(.+)\})?$/);
    let node;
    if (pattern) {
      const name = pattern[1];
      const regexpStr = pattern[2] || LABEL_REG_EXP_STR;
      node = this.children[regexpStr];
      if (!node) {
        if (Object.keys(this.children).some(
          (k) => k !== ONLY_WILDCARD_REG_EXP_STR && k !== TAIL_WILDCARD_REG_EXP_STR
        )) {
          throw PATH_ERROR;
        }
        node = this.children[regexpStr] = new Node();
        if (name !== "") {
          node.varIndex = context.varIndex++;
        }
      }
      if (name !== "") {
        if (paramMap.some((p) => p[0] === name)) {
          throw new Error("Duplicate param name");
        }
        paramMap.push([name, node.varIndex]);
      }
    } else {
      node = this.children[token];
      if (!node) {
        if (Object.keys(this.children).some(
          (k) => k.length > 1 && k !== ONLY_WILDCARD_REG_EXP_STR && k !== TAIL_WILDCARD_REG_EXP_STR
        )) {
          throw PATH_ERROR;
        }
        node = this.children[token] = new Node();
      }
    }
    node.insert(restTokens, index, paramMap, context);
  }
  buildRegExpStr() {
    const childKeys = Object.keys(this.children).sort(compareKey);
    const strList = childKeys.map((k) => {
      const c = this.children[k];
      return (typeof c.varIndex === "number" ? `(${k})@${c.varIndex}` : k) + c.buildRegExpStr();
    });
    if (typeof this.index === "number") {
      strList.unshift(`#${this.index}`);
    }
    if (strList.length === 0) {
      return "";
    }
    if (strList.length === 1) {
      return strList[0];
    }
    return "(?:" + strList.join("|") + ")";
  }
};

// node_modules/hono/dist/router/reg-exp-router/trie.js
var Trie = class {
  constructor() {
    this.context = { varIndex: 0 };
    this.root = new Node();
  }
  insert(path, index) {
    const paramMap = [];
    const tokens = path.match(/(?::[^\/]+)|(?:\/\*$)|./g);
    this.root.insert(tokens, index, paramMap, this.context);
    return paramMap;
  }
  buildRegExp() {
    let regexp = this.root.buildRegExpStr();
    let captureIndex = 0;
    const indexReplacementMap = [];
    const paramReplacementMap = [];
    regexp = regexp.replace(/#(\d+)|@(\d+)|\.\*\$/g, (_, handlerIndex, paramIndex) => {
      if (typeof handlerIndex !== "undefined") {
        indexReplacementMap[++captureIndex] = Number(handlerIndex);
        return "$()";
      }
      if (typeof paramIndex !== "undefined") {
        paramReplacementMap[Number(paramIndex)] = ++captureIndex;
        return "";
      }
      return "";
    });
    return [new RegExp(`^${regexp}`), indexReplacementMap, paramReplacementMap];
  }
};

// node_modules/hono/dist/router/reg-exp-router/router.js
var methodNames = [METHOD_NAME_ALL, ...METHODS].map((method) => method.toUpperCase());
var emptyParam = {};
var nullMatcher = [/^$/, []];
var wildcardRegExpCache = {};
function buildWildcardRegExp(path) {
  return wildcardRegExpCache[path] ?? (wildcardRegExpCache[path] = new RegExp(
    path === "*" ? "" : `^${path.replace(/\/\*/, "(?:|/.*)")}$`
  ));
}
function clearWildcardRegExpCache() {
  wildcardRegExpCache = {};
}
function buildMatcherFromPreprocessedRoutes(routes) {
  const trie = new Trie();
  const handlers = [];
  if (routes.length === 0) {
    return nullMatcher;
  }
  routes = routes.sort(([a], [b]) => a.length - b.length);
  for (let i = 0, len = routes.length; i < len; i++) {
    let paramMap;
    try {
      paramMap = trie.insert(routes[i][0], i);
    } catch (e) {
      throw e === PATH_ERROR ? new UnsupportedPathError(routes[i][0]) : e;
    }
    handlers[i] = [routes[i][1], paramMap.length !== 0 ? paramMap : null];
  }
  const [regexp, indexReplacementMap, paramReplacementMap] = trie.buildRegExp();
  for (let i = 0, len = handlers.length; i < len; i++) {
    const paramMap = handlers[i][1];
    if (paramMap) {
      for (let j = 0, len2 = paramMap.length; j < len2; j++) {
        paramMap[j][1] = paramReplacementMap[paramMap[j][1]];
      }
    }
  }
  const handlerMap = [];
  for (const i in indexReplacementMap) {
    handlerMap[i] = handlers[indexReplacementMap[i]];
  }
  return [regexp, handlerMap];
}
function findMiddleware(middleware, path) {
  if (!middleware) {
    return void 0;
  }
  for (const k of Object.keys(middleware).sort((a, b) => b.length - a.length)) {
    if (buildWildcardRegExp(k).test(path)) {
      return [...middleware[k]];
    }
  }
  return void 0;
}
var RegExpRouter = class {
  constructor() {
    this.middleware = { [METHOD_NAME_ALL]: {} };
    this.routes = { [METHOD_NAME_ALL]: {} };
  }
  add(method, path, handler) {
    var _a;
    const { middleware, routes } = this;
    if (!middleware || !routes) {
      throw new Error("Can not add a route since the matcher is already built.");
    }
    if (!methodNames.includes(method))
      methodNames.push(method);
    if (!middleware[method]) {
      ;
      [middleware, routes].forEach((handlerMap) => {
        handlerMap[method] = {};
        Object.keys(handlerMap[METHOD_NAME_ALL]).forEach((p) => {
          handlerMap[method][p] = [...handlerMap[METHOD_NAME_ALL][p]];
        });
      });
    }
    if (path === "/*") {
      path = "*";
    }
    if (/\*$/.test(path)) {
      const re = buildWildcardRegExp(path);
      if (method === METHOD_NAME_ALL) {
        Object.keys(middleware).forEach((m) => {
          var _a2;
          (_a2 = middleware[m])[path] || (_a2[path] = findMiddleware(middleware[m], path) || findMiddleware(middleware[METHOD_NAME_ALL], path) || []);
        });
      } else {
        (_a = middleware[method])[path] || (_a[path] = findMiddleware(middleware[method], path) || findMiddleware(middleware[METHOD_NAME_ALL], path) || []);
      }
      Object.keys(middleware).forEach((m) => {
        if (method === METHOD_NAME_ALL || method === m) {
          Object.keys(middleware[m]).forEach((p) => {
            re.test(p) && middleware[m][p].push(handler);
          });
        }
      });
      Object.keys(routes).forEach((m) => {
        if (method === METHOD_NAME_ALL || method === m) {
          Object.keys(routes[m]).forEach((p) => re.test(p) && routes[m][p].push(handler));
        }
      });
      return;
    }
    const paths = checkOptionalParameter(path) || [path];
    for (let i = 0, len = paths.length; i < len; i++) {
      const path2 = paths[i];
      Object.keys(routes).forEach((m) => {
        var _a2;
        if (method === METHOD_NAME_ALL || method === m) {
          (_a2 = routes[m])[path2] || (_a2[path2] = [
            ...findMiddleware(middleware[m], path2) || findMiddleware(middleware[METHOD_NAME_ALL], path2) || []
          ]);
          routes[m][path2].push(handler);
        }
      });
    }
  }
  match(method, path) {
    clearWildcardRegExpCache();
    const matchers = this.buildAllMatchers();
    this.match = (method2, path2) => {
      const matcher = matchers[method2];
      const match = path2.match(matcher[0]);
      if (!match) {
        return null;
      }
      const index = match.indexOf("", 1);
      const [handlers, paramMap] = matcher[1][index];
      if (!paramMap) {
        return { handlers, params: emptyParam };
      }
      const params = {};
      for (let i = 0, len = paramMap.length; i < len; i++) {
        params[paramMap[i][0]] = match[paramMap[i][1]];
      }
      return { handlers, params };
    };
    return this.match(method, path);
  }
  buildAllMatchers() {
    const matchers = {};
    methodNames.forEach((method) => {
      matchers[method] = this.buildMatcher(method) || matchers[METHOD_NAME_ALL];
    });
    this.middleware = this.routes = void 0;
    return matchers;
  }
  buildMatcher(method) {
    const routes = [];
    let hasOwnRoute = method === METHOD_NAME_ALL;
    [this.middleware, this.routes].forEach((r) => {
      const ownRoute = r[method] ? Object.keys(r[method]).map((path) => [path, r[method][path]]) : [];
      if (ownRoute.length !== 0) {
        hasOwnRoute || (hasOwnRoute = true);
        routes.push(...ownRoute);
      } else if (method !== METHOD_NAME_ALL) {
        routes.push(
          ...Object.keys(r[METHOD_NAME_ALL]).map((path) => [path, r[METHOD_NAME_ALL][path]])
        );
      }
    });
    if (!hasOwnRoute) {
      return null;
    } else {
      return buildMatcherFromPreprocessedRoutes(routes);
    }
  }
};

// node_modules/hono/dist/router/smart-router/router.js
var SmartRouter = class {
  constructor(init) {
    this.routers = [];
    this.routes = [];
    Object.assign(this, init);
  }
  add(method, path, handler) {
    if (!this.routes) {
      throw new Error("Can not add a route since the matcher is already built.");
    }
    this.routes.push([method, path, handler]);
  }
  match(method, path) {
    if (!this.routes) {
      throw new Error("Fatal error");
    }
    const { routers, routes } = this;
    const len = routers.length;
    let i = 0;
    let res;
    for (; i < len; i++) {
      const router = routers[i];
      try {
        routes.forEach((args) => {
          router.add(...args);
        });
        res = router.match(method, path);
      } catch (e) {
        if (e instanceof UnsupportedPathError) {
          continue;
        }
        throw e;
      }
      this.match = router.match.bind(router);
      this.routers = [router];
      this.routes = void 0;
      break;
    }
    if (i === len) {
      throw new Error("Fatal error");
    }
    return res || null;
  }
  get activeRouter() {
    if (this.routes || this.routers.length !== 1) {
      throw new Error("No active router has been determined yet.");
    }
    return this.routers[0];
  }
};

// node_modules/hono/dist/router/static-router/router.js
var StaticRouter = class {
  constructor() {
    this.middleware = {};
    this.routes = {};
    [METHOD_NAME_ALL, ...METHODS].forEach((method) => {
      this.routes[method.toUpperCase()] = {};
    });
  }
  newRoute() {
    const route = {};
    const routeAll = this.routes[METHOD_NAME_ALL];
    Object.keys(routeAll).forEach((path) => {
      route[path] = {
        handlers: [...routeAll[path].handlers],
        params: {}
      };
    });
    return route;
  }
  add(method, path, handler) {
    var _a, _b;
    const { middleware, routes } = this;
    routes[method] || (routes[method] = this.newRoute());
    if (path === "/*") {
      path = "*";
    }
    if (path === "*") {
      if (method === METHOD_NAME_ALL) {
        middleware[_a = METHOD_NAME_ALL] || (middleware[_a] = { handlers: [], params: {} });
        Object.keys(middleware).forEach((m) => {
          middleware[m].handlers.push(handler);
        });
        Object.keys(routes).forEach((m) => {
          Object.values(routes[m]).forEach((matchRes) => matchRes.handlers.push(handler));
        });
      } else {
        middleware[method] || (middleware[method] = {
          handlers: [...middleware[METHOD_NAME_ALL]?.handlers || []],
          params: {}
        });
        middleware[method].handlers.push(handler);
        if (routes[method]) {
          Object.values(routes[method]).forEach((matchRes) => matchRes.handlers.push(handler));
        }
      }
      return;
    }
    if (/\*|\/:/.test(path)) {
      throw new UnsupportedPathError(path);
    }
    (_b = routes[method])[path] || (_b[path] = {
      handlers: [
        ...routes[METHOD_NAME_ALL][path]?.handlers || middleware[method]?.handlers || middleware[METHOD_NAME_ALL]?.handlers || []
      ],
      params: {}
    });
    if (method === METHOD_NAME_ALL) {
      Object.keys(routes).forEach((m) => {
        routes[m][path]?.handlers?.push(handler);
      });
    } else {
      routes[method][path].handlers.push(handler);
    }
  }
  match(method, path) {
    const { routes, middleware } = this;
    this.match = (method2, path2) => routes[method2][path2] || routes[METHOD_NAME_ALL][path2] || middleware[method2] || middleware[METHOD_NAME_ALL] || null;
    return this.match(method, path);
  }
};

// node_modules/hono/dist/router/trie-router/node.js
function findParam(node, name) {
  for (let i = 0, len = node.patterns.length; i < len; i++) {
    if (typeof node.patterns[i] === "object" && node.patterns[i][1] === name) {
      return true;
    }
  }
  const nodes = Object.values(node.children);
  for (let i = 0, len = nodes.length; i < len; i++) {
    if (findParam(nodes[i], name)) {
      return true;
    }
  }
  return false;
}
var Node2 = class {
  constructor(method, handler, children) {
    this.order = 0;
    this.shouldCapture = false;
    this.children = children || {};
    this.methods = [];
    this.name = "";
    if (method && handler) {
      const m = {};
      m[method] = { handler, score: 0, name: this.name };
      this.methods = [m];
    }
    this.patterns = [];
    this.handlerSetCache = {};
  }
  insert(method, path, handler) {
    this.name = `${method} ${path}`;
    this.order = ++this.order;
    let curNode = this;
    const parts = splitPath(path);
    const parentPatterns = [];
    const errorMessage = (name) => {
      return `Duplicate param name, use another name instead of '${name}' - ${method} ${path} <--- '${name}'`;
    };
    for (let i = 0, len = parts.length; i < len; i++) {
      const p = parts[i];
      if (Object.keys(curNode.children).includes(p)) {
        parentPatterns.push(...curNode.patterns);
        curNode = curNode.children[p];
        continue;
      }
      curNode.children[p] = new Node2();
      const pattern = getPattern(p);
      if (pattern) {
        if (typeof pattern === "object") {
          this.shouldCapture = true;
          for (let j = 0, len2 = parentPatterns.length; j < len2; j++) {
            if (typeof parentPatterns[j] === "object" && parentPatterns[j][1] === pattern[1]) {
              throw new Error(errorMessage(pattern[1]));
            }
          }
          if (Object.values(curNode.children).some((n) => findParam(n, pattern[1]))) {
            throw new Error(errorMessage(pattern[1]));
          }
        }
        curNode.patterns.push(pattern);
        parentPatterns.push(...curNode.patterns);
      }
      parentPatterns.push(...curNode.patterns);
      curNode = curNode.children[p];
      curNode.shouldCapture = this.shouldCapture;
    }
    if (!curNode.methods.length) {
      curNode.methods = [];
    }
    const m = {};
    const handlerSet = { handler, name: this.name, score: this.order };
    m[method] = handlerSet;
    curNode.methods.push(m);
    return curNode;
  }
  getHandlerSets(node, method, wildcard) {
    var _a, _b;
    return (_a = node.handlerSetCache)[_b = `${method}:${wildcard ? "1" : "0"}`] || (_a[_b] = (() => {
      const handlerSets = [];
      for (let i = 0, len = node.methods.length; i < len; i++) {
        const m = node.methods[i];
        const handlerSet = m[method] || m[METHOD_NAME_ALL];
        if (handlerSet !== void 0) {
          handlerSets.push(handlerSet);
        }
      }
      return handlerSets;
    })());
  }
  search(method, path) {
    const handlerSets = [];
    const params = {};
    const curNode = this;
    let curNodes = [curNode];
    const parts = splitPath(path);
    for (let i = 0, len2 = parts.length; i < len2; i++) {
      const part = parts[i];
      const isLast = i === len2 - 1;
      const tempNodes = [];
      let matched = false;
      for (let j = 0, len22 = curNodes.length; j < len22; j++) {
        const node = curNodes[j];
        const nextNode = node.children[part];
        if (nextNode) {
          if (isLast === true) {
            if (nextNode.children["*"]) {
              handlerSets.push(...this.getHandlerSets(nextNode.children["*"], method, true));
            }
            handlerSets.push(...this.getHandlerSets(nextNode, method));
            matched = true;
          } else {
            tempNodes.push(nextNode);
          }
        }
        for (let k = 0, len3 = node.patterns.length; k < len3; k++) {
          const pattern = node.patterns[k];
          if (pattern === "*") {
            const astNode = node.children["*"];
            if (astNode) {
              handlerSets.push(...this.getHandlerSets(astNode, method));
              tempNodes.push(astNode);
            }
            continue;
          }
          if (part === "")
            continue;
          const [key, name, matcher] = pattern;
          if (matcher === true || matcher instanceof RegExp && matcher.test(part)) {
            if (typeof key === "string") {
              if (isLast === true) {
                handlerSets.push(...this.getHandlerSets(node.children[key], method));
              } else {
                tempNodes.push(node.children[key]);
              }
            }
            if (typeof name === "string" && !matched) {
              params[name] = part;
            } else {
              if (node.children[part] && node.children[part].shouldCapture) {
                params[name] = part;
              }
            }
          }
        }
      }
      curNodes = tempNodes;
    }
    const len = handlerSets.length;
    if (len === 0)
      return null;
    if (len === 1)
      return { handlers: [handlerSets[0].handler], params };
    const handlers = handlerSets.sort((a, b) => {
      return a.score - b.score;
    }).map((s) => {
      return s.handler;
    });
    return { handlers, params };
  }
};

// node_modules/hono/dist/router/trie-router/router.js
var TrieRouter = class {
  constructor() {
    this.node = new Node2();
  }
  add(method, path, handler) {
    const results = checkOptionalParameter(path);
    if (results) {
      for (const p of results) {
        this.node.insert(method, p, handler);
      }
      return;
    }
    this.node.insert(method, path, handler);
  }
  match(method, path) {
    return this.node.search(method, path);
  }
};

// node_modules/hono/dist/hono.js
function defineDynamicClass() {
  return class {
  };
}
var Hono = class extends defineDynamicClass() {
  constructor(init = {}) {
    super();
    this.router = new SmartRouter({
      routers: [new StaticRouter(), new RegExpRouter(), new TrieRouter()]
    });
    this.strict = true;
    this._tempPath = "";
    this.path = "/";
    this.routes = [];
    this.notFoundHandler = (c) => {
      return c.text("404 Not Found", 404);
    };
    this.errorHandler = (err, c) => {
      console.trace(err);
      const message = "Internal Server Error";
      return c.text(message, 500);
    };
    this.handleEvent = (event) => {
      return this.dispatch(event.request, event);
    };
    this.fetch = (request, Environment, executionCtx) => {
      return this.dispatch(request, executionCtx, Environment);
    };
    this.request = async (input, requestInit) => {
      const req = input instanceof Request ? input : new Request(input, requestInit);
      return await this.fetch(req);
    };
    extendRequestPrototype();
    const allMethods = [...METHODS, METHOD_NAME_ALL_LOWERCASE];
    allMethods.map((method) => {
      this[method] = (args1, ...args) => {
        if (typeof args1 === "string") {
          this.path = args1;
        } else {
          this.addRoute(method, this.path, args1);
        }
        args.map((handler) => {
          if (typeof handler !== "string") {
            this.addRoute(method, this.path, handler);
          }
        });
        return this;
      };
    });
    Object.assign(this, init);
  }
  route(path, app2) {
    this._tempPath = path;
    if (app2) {
      app2.routes.map((r) => {
        this.addRoute(r.method, r.path, r.handler);
      });
      this._tempPath = "";
    }
    return this;
  }
  use(arg1, ...handlers) {
    if (typeof arg1 === "string") {
      this.path = arg1;
    } else {
      handlers.unshift(arg1);
    }
    handlers.map((handler) => {
      this.addRoute(METHOD_NAME_ALL, this.path, handler);
    });
    return this;
  }
  on(method, path, ...handlers) {
    if (!method)
      return this;
    this.path = path;
    handlers.map((handler) => {
      this.addRoute(method.toUpperCase(), this.path, handler);
    });
    return this;
  }
  onError(handler) {
    this.errorHandler = handler;
    return this;
  }
  notFound(handler) {
    this.notFoundHandler = handler;
    return this;
  }
  showRoutes() {
    const length = 8;
    this.routes.map((route) => {
      console.log(
        `\x1B[32m${route.method}\x1B[0m ${" ".repeat(length - route.method.length)} ${route.path}`
      );
    });
  }
  addRoute(method, path, handler) {
    method = method.toUpperCase();
    if (this._tempPath) {
      path = mergePath(this._tempPath, path);
    }
    this.router.add(method, path, handler);
    const r = { path, method, handler };
    this.routes.push(r);
  }
  matchRoute(method, path) {
    return this.router.match(method, path);
  }
  handleError(err, c) {
    if (err instanceof Error) {
      return this.errorHandler(err, c);
    }
    throw err;
  }
  dispatch(request, eventOrExecutionCtx, env) {
    const path = getPathFromURL(request.url, this.strict);
    const method = request.method;
    const result = this.matchRoute(method, path);
    request.paramData = result?.params;
    const c = new Context(request, env, eventOrExecutionCtx, this.notFoundHandler);
    if (result && result.handlers.length === 1) {
      const handler = result.handlers[0];
      let res;
      try {
        res = handler(c, async () => {
        });
        if (!res)
          return this.notFoundHandler(c);
      } catch (err) {
        return this.handleError(err, c);
      }
      if (res instanceof Response)
        return res;
      return (async () => {
        let awaited;
        try {
          awaited = await res;
          if (!awaited) {
            return this.notFoundHandler(c);
          }
        } catch (err) {
          return this.handleError(err, c);
        }
        return awaited;
      })();
    }
    const handlers = result ? result.handlers : [this.notFoundHandler];
    const composed = compose(handlers, this.notFoundHandler, this.errorHandler);
    return (async () => {
      try {
        const tmp = composed(c);
        const context = tmp instanceof Promise ? await tmp : tmp;
        if (!context.finalized) {
          throw new Error(
            "Context is not finalized. You may forget returning Response object or `await next()`"
          );
        }
        return context.res;
      } catch (err) {
        return this.handleError(err, c);
      }
    })();
  }
};

// node_modules/hono/dist/index.js
Hono.prototype.fire = function() {
  addEventListener("fetch", (event) => {
    void event.respondWith(this.handleEvent(event));
  });
};

// node_modules/hono/dist/middleware/logger/index.js
var humanize = (times) => {
  const [delimiter, separator] = [",", "."];
  const orderTimes = times.map((v) => v.replace(/(\d)(?=(\d\d\d)+(?!\d))/g, "$1" + delimiter));
  return orderTimes.join(separator);
};
var time = (start) => {
  const delta = Date.now() - start;
  return humanize([delta < 1e3 ? delta + "ms" : Math.round(delta / 1e3) + "s"]);
};
var colorStatus = (status) => {
  const out = {
    7: `\x1B[35m${status}\x1B[0m`,
    5: `\x1B[31m${status}\x1B[0m`,
    4: `\x1B[33m${status}\x1B[0m`,
    3: `\x1B[36m${status}\x1B[0m`,
    2: `\x1B[32m${status}\x1B[0m`,
    1: `\x1B[32m${status}\x1B[0m`,
    0: `\x1B[33m${status}\x1B[0m`
  };
  const calculateStatus = status / 100 | 0;
  return out[calculateStatus];
};
function log(fn, prefix, method, path, status = 0, elapsed) {
  const out = prefix === "<--" ? `  ${prefix} ${method} ${path}` : `  ${prefix} ${method} ${path} ${colorStatus(status)} ${elapsed}`;
  fn(out);
}
var logger = (fn = console.log) => {
  return async (c, next) => {
    const { method } = c.req;
    const path = getPathFromURL(c.req.url);
    log(fn, "<--", method, path);
    const start = Date.now();
    await next();
    log(fn, "-->", method, path, c.res.status, time(start));
  };
};

// node_modules/surrealdb.js/esm/utils/guid.js
var id = 0;
function guid_default() {
  return (id = (id + 1) % Number.MAX_SAFE_INTEGER).toString();
}

// node_modules/surrealdb.js/esm/errors/index.js
var AuthenticationError = class extends Error {
  constructor() {
    super(...arguments);
    Object.defineProperty(this, "name", {
      enumerable: true,
      configurable: true,
      writable: true,
      value: "AuthenticationError"
    });
  }
};
var PermissionError = class extends Error {
  constructor() {
    super(...arguments);
    Object.defineProperty(this, "name", {
      enumerable: true,
      configurable: true,
      writable: true,
      value: "PermissionError"
    });
  }
};
var RecordError = class extends Error {
  constructor() {
    super(...arguments);
    Object.defineProperty(this, "name", {
      enumerable: true,
      configurable: true,
      writable: true,
      value: "RecordError"
    });
  }
};
var errors_default = {
  AuthenticationError,
  PermissionError,
  RecordError
};

// node_modules/surrealdb.js/esm/classes/emitter.js
var __classPrivateFieldGet = function(receiver, state, kind, f) {
  if (kind === "a" && !f)
    throw new TypeError("Private accessor was defined without a getter");
  if (typeof state === "function" ? receiver !== state || !f : !state.has(receiver))
    throw new TypeError("Cannot read private member from an object whose class did not declare it");
  return kind === "m" ? f : kind === "a" ? f.call(receiver) : f ? f.value : state.get(receiver);
};
var _Emitter_events;
var Emitter = class {
  constructor() {
    _Emitter_events.set(this, {});
  }
  on(e, func) {
    if (typeof __classPrivateFieldGet(this, _Emitter_events, "f")[e] !== "object") {
      __classPrivateFieldGet(this, _Emitter_events, "f")[e] = [];
    }
    __classPrivateFieldGet(this, _Emitter_events, "f")[e].push(func);
  }
  off(e, func) {
    if (typeof __classPrivateFieldGet(this, _Emitter_events, "f")[e] === "object") {
      const idx = __classPrivateFieldGet(this, _Emitter_events, "f")[e].indexOf(func);
      if (idx > -1) {
        __classPrivateFieldGet(this, _Emitter_events, "f")[e].splice(idx, 1);
      }
    }
  }
  once(e, func) {
    this.on(e, function f(...args) {
      this.off(e, f);
      func.apply(this, args);
    });
  }
  emit(e, ...args) {
    if (typeof __classPrivateFieldGet(this, _Emitter_events, "f")[e] === "object") {
      __classPrivateFieldGet(this, _Emitter_events, "f")[e].forEach((func) => {
        func.apply(this, args);
      });
    }
  }
  removeAllListeners(e) {
    if (e) {
      if (typeof __classPrivateFieldGet(this, _Emitter_events, "f")[e] === "object") {
        __classPrivateFieldGet(this, _Emitter_events, "f")[e] = [];
      }
    } else {
      for (const e2 in __classPrivateFieldGet(this, _Emitter_events, "f")) {
        __classPrivateFieldGet(this, _Emitter_events, "f")[e2] = [];
      }
    }
  }
};
_Emitter_events = /* @__PURE__ */ new WeakMap();

// node_modules/surrealdb.js/esm/classes/live.js
var __classPrivateFieldSet = function(receiver, state, value, kind, f) {
  if (kind === "m")
    throw new TypeError("Private method is not writable");
  if (kind === "a" && !f)
    throw new TypeError("Private accessor was defined without a setter");
  if (typeof state === "function" ? receiver !== state || !f : !state.has(receiver))
    throw new TypeError("Cannot write private member to an object whose class did not declare it");
  return kind === "a" ? f.call(receiver, value) : f ? f.value = value : state.set(receiver, value), value;
};
var __classPrivateFieldGet2 = function(receiver, state, kind, f) {
  if (kind === "a" && !f)
    throw new TypeError("Private accessor was defined without a getter");
  if (typeof state === "function" ? receiver !== state || !f : !state.has(receiver))
    throw new TypeError("Cannot read private member from an object whose class did not declare it");
  return kind === "m" ? f : kind === "a" ? f.call(receiver) : f ? f.value : state.get(receiver);
};
var _Live_id;
var _Live_db;
var _Live_sql;
var _Live_vars;
var Live = class extends Emitter {
  constructor(db2, sql, vars) {
    super();
    _Live_id.set(this, void 0);
    _Live_db.set(this, void 0);
    _Live_sql.set(this, void 0);
    _Live_vars.set(this, void 0);
    __classPrivateFieldSet(this, _Live_db, db2, "f");
    __classPrivateFieldSet(this, _Live_sql, sql, "f");
    __classPrivateFieldSet(this, _Live_vars, vars, "f");
    if (__classPrivateFieldGet2(this, _Live_db, "f").ready) {
      this.open();
    }
    __classPrivateFieldGet2(this, _Live_db, "f").on("opened", () => {
      this.open();
    });
    __classPrivateFieldGet2(this, _Live_db, "f").on("closed", () => {
      __classPrivateFieldSet(this, _Live_id, void 0, "f");
    });
    __classPrivateFieldGet2(this, _Live_db, "f").on("notify", (e) => {
      if (e.query === __classPrivateFieldGet2(this, _Live_id, "f")) {
        switch (e.action) {
          case "CREATE":
            return this.emit("create", e.result);
          case "UPDATE":
            return this.emit("update", e.result);
          case "DELETE":
            return this.emit("delete", e.result);
        }
      }
    });
  }
  kill() {
    if (__classPrivateFieldGet2(this, _Live_id, "f") === void 0)
      return;
    const res = __classPrivateFieldGet2(this, _Live_db, "f").kill(__classPrivateFieldGet2(this, _Live_id, "f"));
    __classPrivateFieldSet(this, _Live_id, void 0, "f");
    return res;
  }
  open() {
    if (__classPrivateFieldGet2(this, _Live_id, "f") !== void 0)
      return;
    return __classPrivateFieldGet2(this, _Live_db, "f").query(__classPrivateFieldGet2(this, _Live_sql, "f"), __classPrivateFieldGet2(this, _Live_vars, "f")).then((res) => {
      if (res[0] && Array.isArray(res[0].result) && res[0].result[0]) {
        __classPrivateFieldSet(this, _Live_id, res[0].result[0], "f");
      }
    });
  }
};
_Live_id = /* @__PURE__ */ new WeakMap(), _Live_db = /* @__PURE__ */ new WeakMap(), _Live_sql = /* @__PURE__ */ new WeakMap(), _Live_vars = /* @__PURE__ */ new WeakMap();

// node_modules/surrealdb.js/esm/ws/node.js
var import_isomorphic_ws = __toESM(require_node(), 1);

// node_modules/surrealdb.js/esm/classes/socket.js
var __classPrivateFieldGet3 = function(receiver, state, kind, f) {
  if (kind === "a" && !f)
    throw new TypeError("Private accessor was defined without a getter");
  if (typeof state === "function" ? receiver !== state || !f : !state.has(receiver))
    throw new TypeError("Cannot read private member from an object whose class did not declare it");
  return kind === "m" ? f : kind === "a" ? f.call(receiver) : f ? f.value : state.get(receiver);
};
var __classPrivateFieldSet2 = function(receiver, state, value, kind, f) {
  if (kind === "m")
    throw new TypeError("Private method is not writable");
  if (kind === "a" && !f)
    throw new TypeError("Private accessor was defined without a setter");
  if (typeof state === "function" ? receiver !== state || !f : !state.has(receiver))
    throw new TypeError("Cannot write private member to an object whose class did not declare it");
  return kind === "a" ? f.call(receiver, value) : f ? f.value = value : state.set(receiver, value), value;
};
var _Socket_instances;
var _Socket_ws;
var _Socket_url;
var _Socket_closed;
var _Socket_status;
var _Socket_init;
var OPENED = Symbol("Opened");
var CLOSED = Symbol("Closed");
var Socket = class extends Emitter {
  constructor(url) {
    super();
    _Socket_instances.add(this);
    _Socket_ws.set(this, void 0);
    _Socket_url.set(this, void 0);
    _Socket_closed.set(this, false);
    _Socket_status.set(this, CLOSED);
    Object.defineProperty(this, "ready", {
      enumerable: true,
      configurable: true,
      writable: true,
      value: void 0
    });
    Object.defineProperty(this, "resolve", {
      enumerable: true,
      configurable: true,
      writable: true,
      value: void 0
    });
    __classPrivateFieldGet3(this, _Socket_instances, "m", _Socket_init).call(this);
    __classPrivateFieldSet2(this, _Socket_url, String(url).replace("http://", "ws://").replace("https://", "wss://"), "f");
  }
  open() {
    __classPrivateFieldSet2(this, _Socket_ws, new import_isomorphic_ws.default(__classPrivateFieldGet3(this, _Socket_url, "f")), "f");
    __classPrivateFieldGet3(this, _Socket_ws, "f").addEventListener("message", (e) => {
      this.emit("message", e);
    });
    __classPrivateFieldGet3(this, _Socket_ws, "f").addEventListener("error", (e) => {
      this.emit("error", e);
    });
    __classPrivateFieldGet3(this, _Socket_ws, "f").addEventListener("close", (e) => {
      this.emit("close", e);
    });
    __classPrivateFieldGet3(this, _Socket_ws, "f").addEventListener("open", (e) => {
      this.emit("open", e);
    });
    __classPrivateFieldGet3(this, _Socket_ws, "f").addEventListener("close", () => {
      if (__classPrivateFieldGet3(this, _Socket_status, "f") === OPENED) {
        __classPrivateFieldGet3(this, _Socket_instances, "m", _Socket_init).call(this);
      }
    });
    __classPrivateFieldGet3(this, _Socket_ws, "f").addEventListener("close", () => {
      __classPrivateFieldSet2(this, _Socket_status, CLOSED, "f");
    });
    __classPrivateFieldGet3(this, _Socket_ws, "f").addEventListener("open", () => {
      __classPrivateFieldSet2(this, _Socket_status, OPENED, "f");
    });
    __classPrivateFieldGet3(this, _Socket_ws, "f").addEventListener("close", () => {
      if (__classPrivateFieldGet3(this, _Socket_closed, "f") === false) {
        setTimeout(() => {
          this.open();
        }, 2500);
      }
    });
    __classPrivateFieldGet3(this, _Socket_ws, "f").addEventListener("open", () => {
      this.resolve();
    });
  }
  send(data) {
    __classPrivateFieldGet3(this, _Socket_ws, "f").send(data);
  }
  close(code4 = 1e3, reason = "Some reason") {
    __classPrivateFieldSet2(this, _Socket_closed, true, "f");
    __classPrivateFieldGet3(this, _Socket_ws, "f").close(code4, reason);
  }
};
_Socket_ws = /* @__PURE__ */ new WeakMap(), _Socket_url = /* @__PURE__ */ new WeakMap(), _Socket_closed = /* @__PURE__ */ new WeakMap(), _Socket_status = /* @__PURE__ */ new WeakMap(), _Socket_instances = /* @__PURE__ */ new WeakSet(), _Socket_init = function _Socket_init2() {
  this.ready = new Promise((resolve) => {
    this.resolve = resolve;
  });
};

// node_modules/surrealdb.js/esm/classes/pinger.js
var __classPrivateFieldSet3 = function(receiver, state, value, kind, f) {
  if (kind === "m")
    throw new TypeError("Private method is not writable");
  if (kind === "a" && !f)
    throw new TypeError("Private accessor was defined without a setter");
  if (typeof state === "function" ? receiver !== state || !f : !state.has(receiver))
    throw new TypeError("Cannot write private member to an object whose class did not declare it");
  return kind === "a" ? f.call(receiver, value) : f ? f.value = value : state.set(receiver, value), value;
};
var __classPrivateFieldGet4 = function(receiver, state, kind, f) {
  if (kind === "a" && !f)
    throw new TypeError("Private accessor was defined without a getter");
  if (typeof state === "function" ? receiver !== state || !f : !state.has(receiver))
    throw new TypeError("Cannot read private member from an object whose class did not declare it");
  return kind === "m" ? f : kind === "a" ? f.call(receiver) : f ? f.value : state.get(receiver);
};
var _Pinger_pinger;
var _Pinger_interval;
var Pinger = class {
  constructor(interval = 3e4) {
    _Pinger_pinger.set(this, void 0);
    _Pinger_interval.set(this, void 0);
    __classPrivateFieldSet3(this, _Pinger_interval, interval, "f");
  }
  start(func, ...args) {
    __classPrivateFieldSet3(this, _Pinger_pinger, setInterval(func, __classPrivateFieldGet4(this, _Pinger_interval, "f"), ...args), "f");
  }
  stop() {
    clearInterval(__classPrivateFieldGet4(this, _Pinger_pinger, "f"));
  }
};
_Pinger_pinger = /* @__PURE__ */ new WeakMap(), _Pinger_interval = /* @__PURE__ */ new WeakMap();

// node_modules/surrealdb.js/esm/index.js
var __classPrivateFieldSet4 = function(receiver, state, value, kind, f) {
  if (kind === "m")
    throw new TypeError("Private method is not writable");
  if (kind === "a" && !f)
    throw new TypeError("Private accessor was defined without a setter");
  if (typeof state === "function" ? receiver !== state || !f : !state.has(receiver))
    throw new TypeError("Cannot write private member to an object whose class did not declare it");
  return kind === "a" ? f.call(receiver, value) : f ? f.value = value : state.set(receiver, value), value;
};
var __classPrivateFieldGet5 = function(receiver, state, kind, f) {
  if (kind === "a" && !f)
    throw new TypeError("Private accessor was defined without a getter");
  if (typeof state === "function" ? receiver !== state || !f : !state.has(receiver))
    throw new TypeError("Cannot read private member from an object whose class did not declare it");
  return kind === "m" ? f : kind === "a" ? f.call(receiver) : f ? f.value : state.get(receiver);
};
var _Surreal_instances;
var _Surreal_ws;
var _Surreal_url;
var _Surreal_token;
var _Surreal_pinger;
var _Surreal_attempted;
var _Surreal_init;
var _Surreal_send;
var _Surreal_auth;
var _Surreal_signin;
var _Surreal_signup;
var _Surreal_result;
var _Surreal_output;
var singleton;
var Surreal = class extends Emitter {
  constructor(url, token) {
    super();
    _Surreal_instances.add(this);
    _Surreal_ws.set(this, void 0);
    _Surreal_url.set(this, void 0);
    _Surreal_token.set(this, void 0);
    _Surreal_pinger.set(this, void 0);
    _Surreal_attempted.set(this, void 0);
    __classPrivateFieldSet4(this, _Surreal_url, url, "f");
    __classPrivateFieldSet4(this, _Surreal_token, token, "f");
    if (url) {
      this.connect(url);
    }
  }
  static get Instance() {
    return singleton ? singleton : singleton = new Surreal();
  }
  static get AuthenticationError() {
    return errors_default.AuthenticationError;
  }
  static get PermissionError() {
    return errors_default.PermissionError;
  }
  static get RecordError() {
    return errors_default.RecordError;
  }
  static get Live() {
    return Live;
  }
  get token() {
    return __classPrivateFieldGet5(this, _Surreal_token, "f");
  }
  set token(token) {
    __classPrivateFieldSet4(this, _Surreal_token, token, "f");
  }
  connect(url) {
    __classPrivateFieldSet4(this, _Surreal_ws, new Socket(url), "f");
    __classPrivateFieldSet4(this, _Surreal_pinger, new Pinger(3e4), "f");
    __classPrivateFieldGet5(this, _Surreal_ws, "f").on("open", () => {
      __classPrivateFieldGet5(this, _Surreal_instances, "m", _Surreal_init).call(this);
    });
    __classPrivateFieldGet5(this, _Surreal_ws, "f").on("open", () => {
      this.emit("open");
      this.emit("opened");
      __classPrivateFieldGet5(this, _Surreal_pinger, "f").start(() => {
        this.ping();
      });
    });
    __classPrivateFieldGet5(this, _Surreal_ws, "f").on("close", () => {
      this.emit("close");
      this.emit("closed");
      __classPrivateFieldGet5(this, _Surreal_pinger, "f").stop();
    });
    __classPrivateFieldGet5(this, _Surreal_ws, "f").on("message", (e) => {
      const d = JSON.parse(e.data);
      if (d.method !== "notify") {
        return this.emit(d.id, d);
      }
      if (d.method === "notify") {
        return d.params.forEach((r) => {
          this.emit("notify", r);
        });
      }
    });
    __classPrivateFieldGet5(this, _Surreal_ws, "f").open();
    return this.wait();
  }
  sync(query, vars) {
    return new Live(this, query, vars);
  }
  wait() {
    return __classPrivateFieldGet5(this, _Surreal_ws, "f").ready.then(() => {
      return __classPrivateFieldGet5(this, _Surreal_attempted, "f");
    });
  }
  close() {
    __classPrivateFieldGet5(this, _Surreal_ws, "f").close();
  }
  ping() {
    const id2 = guid_default();
    return __classPrivateFieldGet5(this, _Surreal_ws, "f").ready.then(() => {
      return new Promise(() => {
        __classPrivateFieldGet5(this, _Surreal_instances, "m", _Surreal_send).call(this, id2, "ping");
      });
    });
  }
  use(ns, db2) {
    const id2 = guid_default();
    return __classPrivateFieldGet5(this, _Surreal_ws, "f").ready.then(() => {
      return new Promise((resolve, reject) => {
        this.once(id2, (res) => __classPrivateFieldGet5(this, _Surreal_instances, "m", _Surreal_result).call(this, res, resolve, reject));
        __classPrivateFieldGet5(this, _Surreal_instances, "m", _Surreal_send).call(this, id2, "use", [ns, db2]);
      });
    });
  }
  info() {
    const id2 = guid_default();
    return __classPrivateFieldGet5(this, _Surreal_ws, "f").ready.then(() => {
      return new Promise((resolve, reject) => {
        this.once(id2, (res) => __classPrivateFieldGet5(this, _Surreal_instances, "m", _Surreal_result).call(this, res, resolve, reject));
        __classPrivateFieldGet5(this, _Surreal_instances, "m", _Surreal_send).call(this, id2, "info");
      });
    });
  }
  signup(vars) {
    const id2 = guid_default();
    return __classPrivateFieldGet5(this, _Surreal_ws, "f").ready.then(() => {
      return new Promise((resolve, reject) => {
        this.once(id2, (res) => __classPrivateFieldGet5(this, _Surreal_instances, "m", _Surreal_signup).call(this, res, resolve, reject));
        __classPrivateFieldGet5(this, _Surreal_instances, "m", _Surreal_send).call(this, id2, "signup", [vars]);
      });
    });
  }
  signin(vars) {
    const id2 = guid_default();
    return __classPrivateFieldGet5(this, _Surreal_ws, "f").ready.then(() => {
      return new Promise((resolve, reject) => {
        this.once(id2, (res) => __classPrivateFieldGet5(this, _Surreal_instances, "m", _Surreal_signin).call(this, res, resolve, reject));
        __classPrivateFieldGet5(this, _Surreal_instances, "m", _Surreal_send).call(this, id2, "signin", [vars]);
      });
    });
  }
  invalidate() {
    const id2 = guid_default();
    return __classPrivateFieldGet5(this, _Surreal_ws, "f").ready.then(() => {
      return new Promise((resolve, reject) => {
        this.once(id2, (res) => __classPrivateFieldGet5(this, _Surreal_instances, "m", _Surreal_auth).call(this, res, resolve, reject));
        __classPrivateFieldGet5(this, _Surreal_instances, "m", _Surreal_send).call(this, id2, "invalidate");
      });
    });
  }
  authenticate(token) {
    const id2 = guid_default();
    return __classPrivateFieldGet5(this, _Surreal_ws, "f").ready.then(() => {
      return new Promise((resolve, reject) => {
        this.once(id2, (res) => __classPrivateFieldGet5(this, _Surreal_instances, "m", _Surreal_auth).call(this, res, resolve, reject));
        __classPrivateFieldGet5(this, _Surreal_instances, "m", _Surreal_send).call(this, id2, "authenticate", [token]);
      });
    });
  }
  live(table) {
    const id2 = guid_default();
    return this.wait().then(() => {
      return new Promise((resolve, reject) => {
        this.once(id2, (res) => __classPrivateFieldGet5(this, _Surreal_instances, "m", _Surreal_result).call(this, res, resolve, reject));
        __classPrivateFieldGet5(this, _Surreal_instances, "m", _Surreal_send).call(this, id2, "live", [table]);
      });
    });
  }
  kill(query) {
    const id2 = guid_default();
    return this.wait().then(() => {
      return new Promise((resolve, reject) => {
        this.once(id2, (res) => __classPrivateFieldGet5(this, _Surreal_instances, "m", _Surreal_result).call(this, res, resolve, reject));
        __classPrivateFieldGet5(this, _Surreal_instances, "m", _Surreal_send).call(this, id2, "kill", [query]);
      });
    });
  }
  let(key, val) {
    const id2 = guid_default();
    return this.wait().then(() => {
      return new Promise((resolve, reject) => {
        this.once(id2, (res) => __classPrivateFieldGet5(this, _Surreal_instances, "m", _Surreal_result).call(this, res, resolve, reject));
        __classPrivateFieldGet5(this, _Surreal_instances, "m", _Surreal_send).call(this, id2, "let", [key, val]);
      });
    });
  }
  query(query, vars) {
    const id2 = guid_default();
    return this.wait().then(() => {
      return new Promise((resolve, reject) => {
        this.once(id2, (res) => __classPrivateFieldGet5(this, _Surreal_instances, "m", _Surreal_result).call(this, res, resolve, reject));
        __classPrivateFieldGet5(this, _Surreal_instances, "m", _Surreal_send).call(this, id2, "query", [query, vars]);
      });
    });
  }
  select(thing) {
    const id2 = guid_default();
    return this.wait().then(() => {
      return new Promise((resolve, reject) => {
        this.once(id2, (res) => __classPrivateFieldGet5(this, _Surreal_instances, "m", _Surreal_output).call(this, res, "select", thing, resolve, reject));
        __classPrivateFieldGet5(this, _Surreal_instances, "m", _Surreal_send).call(this, id2, "select", [thing]);
      });
    });
  }
  create(thing, data) {
    const id2 = guid_default();
    return this.wait().then(() => {
      return new Promise((resolve, reject) => {
        this.once(id2, (res) => __classPrivateFieldGet5(this, _Surreal_instances, "m", _Surreal_output).call(this, res, "create", thing, resolve, reject));
        __classPrivateFieldGet5(this, _Surreal_instances, "m", _Surreal_send).call(this, id2, "create", [thing, data]);
      });
    });
  }
  update(thing, data) {
    const id2 = guid_default();
    return this.wait().then(() => {
      return new Promise((resolve, reject) => {
        this.once(id2, (res) => __classPrivateFieldGet5(this, _Surreal_instances, "m", _Surreal_output).call(this, res, "update", thing, resolve, reject));
        __classPrivateFieldGet5(this, _Surreal_instances, "m", _Surreal_send).call(this, id2, "update", [thing, data]);
      });
    });
  }
  change(thing, data) {
    const id2 = guid_default();
    return this.wait().then(() => {
      return new Promise((resolve, reject) => {
        this.once(id2, (res) => __classPrivateFieldGet5(this, _Surreal_instances, "m", _Surreal_output).call(this, res, "change", thing, resolve, reject));
        __classPrivateFieldGet5(this, _Surreal_instances, "m", _Surreal_send).call(this, id2, "change", [thing, data]);
      });
    });
  }
  modify(thing, data) {
    const id2 = guid_default();
    return this.wait().then(() => {
      return new Promise((resolve, reject) => {
        this.once(id2, (res) => __classPrivateFieldGet5(this, _Surreal_instances, "m", _Surreal_output).call(this, res, "modify", thing, resolve, reject));
        __classPrivateFieldGet5(this, _Surreal_instances, "m", _Surreal_send).call(this, id2, "modify", [thing, data]);
      });
    });
  }
  delete(thing) {
    const id2 = guid_default();
    return this.wait().then(() => {
      return new Promise((resolve, reject) => {
        this.once(id2, (res) => __classPrivateFieldGet5(this, _Surreal_instances, "m", _Surreal_output).call(this, res, "delete", thing, resolve, reject));
        __classPrivateFieldGet5(this, _Surreal_instances, "m", _Surreal_send).call(this, id2, "delete", [thing]);
      });
    });
  }
};
_Surreal_ws = /* @__PURE__ */ new WeakMap(), _Surreal_url = /* @__PURE__ */ new WeakMap(), _Surreal_token = /* @__PURE__ */ new WeakMap(), _Surreal_pinger = /* @__PURE__ */ new WeakMap(), _Surreal_attempted = /* @__PURE__ */ new WeakMap(), _Surreal_instances = /* @__PURE__ */ new WeakSet(), _Surreal_init = function _Surreal_init2() {
  __classPrivateFieldSet4(this, _Surreal_attempted, new Promise((res) => {
    __classPrivateFieldGet5(this, _Surreal_token, "f") ? this.authenticate(__classPrivateFieldGet5(this, _Surreal_token, "f")).then(res).catch(res) : res();
  }), "f");
}, _Surreal_send = function _Surreal_send2(id2, method, params = []) {
  __classPrivateFieldGet5(this, _Surreal_ws, "f").send(JSON.stringify({
    id: id2,
    method,
    params
  }));
}, _Surreal_auth = function _Surreal_auth2(res, resolve, reject) {
  if (res.error) {
    return reject(new Surreal.AuthenticationError(res.error.message));
  } else {
    return resolve(res.result);
  }
}, _Surreal_signin = function _Surreal_signin2(res, resolve, reject) {
  if (res.error) {
    return reject(new Surreal.AuthenticationError(res.error.message));
  } else {
    __classPrivateFieldSet4(this, _Surreal_token, res.result, "f");
    return resolve(res.result);
  }
}, _Surreal_signup = function _Surreal_signup2(res, resolve, reject) {
  if (res.error) {
    return reject(new Surreal.AuthenticationError(res.error.message));
  } else if (res.result) {
    __classPrivateFieldSet4(this, _Surreal_token, res.result, "f");
    return resolve(res.result);
  }
}, _Surreal_result = function _Surreal_result2(res, resolve, reject) {
  if (res.error) {
    return reject(new Error(res.error.message));
  } else if (res.result) {
    return resolve(res.result);
  }
  return resolve(void 0);
}, _Surreal_output = function _Surreal_output2(res, type, id2, resolve, reject) {
  if (res.error) {
    return reject(new Error(res.error.message));
  } else if (res.result) {
    switch (type) {
      case "delete":
        return resolve(void 0);
      case "create":
        return Array.isArray(res.result) && res.result.length ? resolve(res.result[0]) : reject(new Surreal.PermissionError(`Unable to create record: ${id2}`));
      case "update":
        if (typeof id2 === "string" && id2.includes(":")) {
          return Array.isArray(res.result) && res.result.length ? resolve(res.result[0]) : reject(new Surreal.PermissionError(`Unable to update record: ${id2}`));
        } else {
          return resolve(res.result);
        }
      case "change":
        if (typeof id2 === "string" && id2.includes(":")) {
          return Array.isArray(res.result) && res.result.length ? resolve(res.result[0]) : reject(new Surreal.PermissionError(`Unable to update record: ${id2}`));
        } else {
          return resolve(res.result);
        }
      case "modify":
        if (typeof id2 === "string" && id2.includes(":")) {
          return Array.isArray(res.result) && res.result.length ? resolve(res.result[0]) : reject(new Surreal.PermissionError(`Unable to update record: ${id2}`));
        } else {
          return resolve(res.result);
        }
      default:
        if (typeof id2 === "string" && id2.includes(":")) {
          return Array.isArray(res.result) && res.result.length ? resolve(res.result) : reject(new Surreal.RecordError(`Record not found: ${id2}`));
        } else {
          return resolve(res.result);
        }
    }
  }
  return resolve(void 0);
};

// src/components/Head.tsx
function Head(props) {
  return /* @__PURE__ */ createElement("head", null, /* @__PURE__ */ createElement("title", null, props?.title || "No Title?!"), /* @__PURE__ */ createElement("link", { rel: "stylesheet", href: "/build.css" }), /* @__PURE__ */ createElement("meta", { charset: "utf-8" }), /* @__PURE__ */ createElement("meta", { name: "viewport", content: "width=device-width, initial-scale=1.0" }), /* @__PURE__ */ createElement("script", { src: "https://twemoji.maxcdn.com/v/latest/twemoji.min.js", crossorigin: "anonymous" }), /* @__PURE__ */ createElement("script", { code: `twemoji.parse(document.body,{
  folder: 'svg',
  ext: '.svg',
  callback: function(icon, options, variant) {
    switch ( icon ) {
        case 'a9':      // \xA9 copyright
        case 'ae':      // \xAE registered trademark
        case '2122':    // \u2122 trademark
            return false;
    }
    return ''.concat(options.base, options.size, '/', icon, options.ext);
}
});` }));
}

// src/components/Link.tsx
function Link(props) {
  return /* @__PURE__ */ createElement(
    "a",
    {
      href: props?.to || "#",
      class: props?.class
    },
    props?.children
  );
}

// src/components/Navbar.tsx
var code = `function logout(e){
    e.preventDefault();
    localStorage.removeItem('token');
    window.location.href = '/';
  };
  (async()=> {
  if(localStorage.token == undefined) return;
  const res = await fetch(\`/api/getUser?token=\${localStorage.token}\`);
  const data = await res.json();
  if (data.success) {
    let $ = document.querySelector.bind(document);
    let user = data.user;
    $('#userAvatar').src = user.avatarURL;
    $('#username').innerText = user.username;
    $('#logg').innerText = 'Logout';
    $('#logg').onclick = logout;
    $('#logg').href = '/';
    $('#dash').classList.remove('hidden');
  }
  else{
    localStorage.removeItem('token');
  }
  })();
  `;
function Navbar() {
  return /* @__PURE__ */ createElement("div", { class: "z-[1000] fixed mt-2 min-w-full mb-16" }, /* @__PURE__ */ createElement("div", { class: "flex navbar bg-gradient-to-r from-purple-600 to-pink-600 rounded-box mx-auto max-w-7xl" }, /* @__PURE__ */ createElement("div", { class: "flex-1" }, /* @__PURE__ */ createElement(Link, { to: "/", class: "btn btn-ghost font-bold text-xl text-white" }, "Blog.It!")), /* @__PURE__ */ createElement("div", { class: "flex-none gap-2" }, /* @__PURE__ */ createElement("div", { class: "dropdown dropdown-end" }, /* @__PURE__ */ createElement("label", { tabIndex: 0, class: "btn btn-ghost btn-circle avatar" }, /* @__PURE__ */ createElement("div", { class: "w-10 rounded-full" }, /* @__PURE__ */ createElement(
    "img",
    {
      id: "userAvatar",
      src: "https://avataaars.io/?avatarStyle=Circle&topType=ShortHairShortRound&accessoriesType=Blank&hairColor=BrownDark&facialHairType=Blank&clotheType=ShirtVNeck&clotheColor=Red&eyeType=Default&eyebrowType=DefaultNatural&mouthType=Default&skinColor=Light"
    }
  ))), /* @__PURE__ */ createElement("ul", { tabIndex: 0, class: "mt-3 p-2 shadow menu menu-compact dropdown-content bg-slate-400 dark:bg-slate-600 rounded-box w-52 text-white" }, /* @__PURE__ */ createElement("li", { class: "hover:bg-slate-500 dark:hover:bg-slate-900" }, /* @__PURE__ */ createElement("p", { id: "username" }, "User")), /* @__PURE__ */ createElement("li", { class: "hidden hover:bg-slate-500 dark:hover:bg-slate-900", id: "dash" }, /* @__PURE__ */ createElement("a", { to: "/dash" }, "Dashboard")), /* @__PURE__ */ createElement("li", { class: "hover:bg-slate-500 dark:hover:bg-slate-900" }, /* @__PURE__ */ createElement("a", { id: "logg", href: "/login" }, "Login")))))), /* @__PURE__ */ createElement("script", { code }));
}

// src/components/Layout.tsx
function Layout(props) {
  return /* @__PURE__ */ createElement("html", null, /* @__PURE__ */ createElement(Head, { title: props?.title }), /* @__PURE__ */ createElement("body", { class: "dark:bg-slate-800 bg-slate-200 m-0 p-0 min-h-full" }, /* @__PURE__ */ createElement(Navbar, null), /* @__PURE__ */ createElement("div", { class: "pt-24" }), props?.children, /* @__PURE__ */ createElement("script", { src: "/fix.js" })));
}

// src/components/BlogCard.tsx
var BlogCode = `(async()=>{
  //find all heart buttons
  let heartButtons = document.querySelectorAll("button[name='heart']");
  //find all bookmark buttons
  let bookmarkButtons = document.querySelectorAll("button[name='bookmark']");
  let heartFilledSVG = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="w-6 h-6"><path d="M11.645 20.91l-.007-.003-.022-.012a15.247 15.247 0 01-.383-.218 25.18 25.18 0 01-4.244-3.17C4.688 15.36 2.25 12.174 2.25 8.25 2.25 5.322 4.714 3 7.688 3A5.5 5.5 0 0112 5.052 5.5 5.5 0 0116.313 3c2.973 0 5.437 2.322 5.437 5.25 0 3.925-2.438 7.111-4.739 9.256a25.175 25.175 0 01-4.244 3.17 15.247 15.247 0 01-.383.219l-.022.012-.007.004-.003.001a.752.752 0 01-.704 0l-.003-.001z" /></svg>';
  let heartEmptySVG = '<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-6 h-6"><path stroke-linecap="round" stroke-linejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" /></svg>';
  let bookmarkFilledSVG = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="w-6 h-6"><path fill-rule="evenodd" d="M6.32 2.577a49.255 49.255 0 0111.36 0c1.497.174 2.57 1.46 2.57 2.93V21a.75.75 0 01-1.085.67L12 18.089l-7.165 3.583A.75.75 0 013.75 21V5.507c0-1.47 1.073-2.756 2.57-2.93z" clip-rule="evenodd" /></svg>';
  let bookmarkEmptySVG = '<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-6 h-6"><path stroke-linecap="round" stroke-linejoin="round" d="M17.593 3.322c1.1.128 1.907 1.077 1.907 2.185V21L12 17.25 4.5 21V5.507c0-1.108.806-2.057 1.907-2.185a48.507 48.507 0 0111.186 0z" /></svg>';
  //add event listeners to all heart buttons
  heartButtons.forEach((button) => {
    button.addEventListener("click", (e) => {
      let filled = button.getAttribute("filled");
      if (filled == "false") {
        button.innerHTML = heartFilledSVG;
        button.setAttribute("filled", "true");
      } else {
        button.innerHTML = heartEmptySVG;
        button.setAttribute("filled", "false");
      }
    });
  });
  //add event listeners to all bookmark buttons
  bookmarkButtons.forEach((button) => {
    button.addEventListener("click", (e) => {
      let filled = button.getAttribute("filled");
      if (filled == "false") {
        button.innerHTML = bookmarkFilledSVG;
        button.setAttribute("filled", "true");
      } else {
        button.innerHTML = bookmarkEmptySVG;
        button.setAttribute("filled", "false");
      }
    });
  });
})()`;
function BlogCard(props) {
  return /* @__PURE__ */ createElement("div", { class: "card w-96 bg-base-100 dark:bg-slate-900 shadow-xl carousel-item relative" }, /* @__PURE__ */ createElement("figure", { class: "px-10 pt-10 w-full" }, /* @__PURE__ */ createElement("img", { src: props.img || "https://placeimg.com/400/225/arch", alt: "Shoes", class: "rounded-xl" })), /* @__PURE__ */ createElement("div", { class: "card-body" }, /* @__PURE__ */ createElement("div", { class: "flex" }, /* @__PURE__ */ createElement("div", { class: "avatar" }, /* @__PURE__ */ createElement("div", { class: "w-8 rounded-full" }, /* @__PURE__ */ createElement("img", { src: props.avatarURL || "https://placeimg.com/192/192/people" }))), /* @__PURE__ */ createElement("p", { class: "text-slate-600 dark:text-slate-300 my-auto pl-4" }, " By ", props.author || "Author")), /* @__PURE__ */ createElement("h2", { class: "dark:text-white text-2xl pl-8 font-bold" }, props.title || "Blog Title"), /* @__PURE__ */ createElement("div", { class: "card-actions" }, /* @__PURE__ */ createElement("button", { class: "my-auto text-pink-700", name: "heart", filled: "false" }, /* @__PURE__ */ createElement(
    "svg",
    {
      xmlns: "http://www.w3.org/2000/svg",
      fill: "none",
      viewBox: "0 0 24 24",
      "stroke-width": "1.5",
      stroke: "currentColor",
      class: "w-6 h-6"
    },
    /* @__PURE__ */ createElement("path", { "stroke-linecap": "round", "stroke-linejoin": "round", d: "M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" })
  )), /* @__PURE__ */ createElement("button", { class: "mr-auto my-auto text-blue-600", name: "bookmark", filled: "false" }, /* @__PURE__ */ createElement(
    "svg",
    {
      xmlns: "http://www.w3.org/2000/svg",
      fill: "none",
      viewBox: "0 0 24 24",
      "stroke-width": "1.5",
      stroke: "currentColor",
      class: "w-6 h-6"
    },
    /* @__PURE__ */ createElement("path", { "stroke-linecap": "round", "stroke-linejoin": "round", d: "M17.593 3.322c1.1.128 1.907 1.077 1.907 2.185V21L12 17.25 4.5 21V5.507c0-1.108.806-2.057 1.907-2.185a48.507 48.507 0 0111.186 0z" })
  )), /* @__PURE__ */ createElement("a", { href: props.slug ? `/blogs/${props.slug}` : "#", class: "rounded-md text-white text-semibold px-8 py-2 bg-indigo-600 hover:bg-indigo-700 ml-auto" }, "View"))));
}

// src/index.tsx
async function main(c, db2) {
  let blogs = await db2.query("SELECT * FROM blogs ORDER BY id DESC LIMIT 10");
  blogs = blogs[0].result;
  console.log(blogs);
  return c.html(
    /* @__PURE__ */ createElement(Layout, { title: "Hello?" }, /* @__PURE__ */ createElement("div", { class: "mx-8" }, /* @__PURE__ */ createElement("h1", { class: "font-extrabold dark:text-white text-6xl py-8" }, "Latest Blogs"), /* @__PURE__ */ createElement("div", { class: "carousel w-full gap-4" }, blogs.length > 0 ? blogs.map((blog) => {
      return /* @__PURE__ */ createElement(BlogCard, { img: blog.photo, avatarURL: blog.authorpic, title: blog.title, author: blog.author });
    }) : /* @__PURE__ */ createElement("p", { class: "text-2xl text-gray-500 dark:text-gray-300" }, "No blogs found \u{1F614}")), /* @__PURE__ */ createElement("script", { code: BlogCode })))
  );
}

// src/login.tsx
var code2 = `function submitForm() {
  const form = document.getElementById('login');
  const formData = new FormData(form);
  const data = Object.fromEntries(formData);
  fetch('/api/getToken', {
    method: 'POST',
    body: JSON.stringify(data),
    headers: {
      'Content-Type': 'application/json'
    }
  }).then(function (res){return res.json()}).then(function(data){
    console.log(data);
    //save token to localstorage if successful
    if (data.success) {
      localStorage.setItem('token', data.token);
      window.location.href = '/';
    }
    else{
      alert('Failed to login:' + data.error);
      //reload page
      window.location.href = '/login';
    }
  });
}`;
async function main2(c) {
  return c.html(
    /* @__PURE__ */ createElement(Layout, { title: "Login" }, /* @__PURE__ */ createElement("div", { class: "mx-auto container bg-slate-800 p-8 max-w-md rounded-md" }, /* @__PURE__ */ createElement("h1", { class: "text-4xl text-white font-bold pb-8 text-center" }, "Login"), /* @__PURE__ */ createElement("form", { id: "login", onsubmit: "event.preventDefault(); submitForm();" }, /* @__PURE__ */ createElement("p", { class: "text-white font-semibold text-lg py-2" }, "Email"), /* @__PURE__ */ createElement(
      "input",
      {
        type: "email",
        name: "email",
        placeholder: "Email",
        class: "rounded-md bg-slate-900 p-4 text-white min-w-full focus:outline-none focus:border-indigo-700 focus:border"
      }
    ), /* @__PURE__ */ createElement("p", { class: "text-white font-semibold text-lg py-2" }, "Password"), /* @__PURE__ */ createElement(
      "input",
      {
        type: "password",
        name: "password",
        placeholder: "Password",
        class: "rounded-md bg-slate-900 p-4 text-white min-w-full focus:outline-none focus:border-indigo-700 focus:border"
      }
    ), /* @__PURE__ */ createElement("div", { class: "mt-12" }, /* @__PURE__ */ createElement(
      "input",
      {
        type: "submit",
        value: "Login",
        class: "p-4 bg-indigo-600 text-white text-bold text-2xl rounded-md min-w-full hover:bg-indigo-700"
      }
    )))), /* @__PURE__ */ createElement("script", null, code2))
  );
}

// src/signup.tsx
var code3 = `function submitForm() {
  const form = document.getElementById('login');
  const formData = new FormData(form);
  const data = Object.fromEntries(formData);
  fetch('/api/createUser', {
    method: 'POST',
    body: JSON.stringify(data),
    headers: {
      'Content-Type': 'application/json'
    }
  }).then(function (res){return res.json()}).then(function(data){
    console.log(data);
    //save token to localstorage if successful
    if (data.success) {
      localStorage.setItem('token', data.token);
      window.location.href = '/';
    }
    else{
      alert('Failed to sign up:' + data.error);
      //reload page
      window.location.href = '/signup';
    }
  });
}`;
async function main3(c) {
  return c.html(
    /* @__PURE__ */ createElement(Layout, { title: "Sign Up" }, /* @__PURE__ */ createElement("div", { class: "mx-auto container bg-slate-800 p-8 max-w-md rounded-md" }, /* @__PURE__ */ createElement("h1", { class: "text-4xl text-white font-bold pb-8 text-center" }, "Register Account"), /* @__PURE__ */ createElement("form", { id: "login", onsubmit: "event.preventDefault(); submitForm();" }, /* @__PURE__ */ createElement("p", { class: "text-white font-semibold text-lg py-2" }, "Name"), /* @__PURE__ */ createElement(
      "input",
      {
        type: "text",
        name: "name",
        placeholder: "Name",
        class: "rounded-md bg-slate-900 p-4 text-white min-w-full focus:outline-none focus:border-indigo-700 focus:border"
      }
    ), /* @__PURE__ */ createElement("p", { class: "text-white font-semibold text-lg py-2" }, "Email"), /* @__PURE__ */ createElement(
      "input",
      {
        type: "email",
        name: "email",
        placeholder: "Email",
        class: "rounded-md bg-slate-900 p-4 text-white min-w-full focus:outline-none focus:border-indigo-700 focus:border"
      }
    ), /* @__PURE__ */ createElement("p", { class: "text-white font-semibold text-lg py-2" }, "Password"), /* @__PURE__ */ createElement(
      "input",
      {
        type: "password",
        name: "password",
        placeholder: "Password",
        class: "rounded-md bg-slate-900 p-4 text-white min-w-full focus:outline-none focus:border-indigo-700 focus:border"
      }
    ), /* @__PURE__ */ createElement("div", { class: "mt-12" }, /* @__PURE__ */ createElement(
      "input",
      {
        type: "submit",
        value: "Create Account",
        class: "p-4 bg-indigo-600 text-white text-bold text-2xl rounded-md min-w-full hover:bg-indigo-700"
      }
    )))), /* @__PURE__ */ createElement("script", null, code3))
  );
}

// src/api/index.ts
async function api_default(c) {
  return new Response(
    JSON.stringify({ hello: "world" }),
    { status: 200 }
  );
}

// node_modules/hono/dist/middleware/serve-static/bun.js
import { existsSync } from "fs";

// node_modules/hono/dist/utils/filepath.js
var getFilePath = (options) => {
  let filename = options.filename;
  let root = options.root || "";
  const defaultDocument = options.defaultDocument || "index.html";
  if (filename.endsWith("/")) {
    filename = filename.concat(defaultDocument);
  } else if (!filename.match(/\.[a-zA-Z0-9]+$/)) {
    filename = filename.concat("/" + defaultDocument);
  }
  filename = filename.replace(/^\.?\//, "");
  root = root.replace(/\/$/, "");
  let path = root ? root + "/" + filename : filename;
  path = path.replace(/^\.?\//, "");
  return path;
};

// node_modules/hono/dist/utils/mime.js
var getMimeType = (filename) => {
  const regexp = /\.([a-zA-Z0-9]+?)$/;
  const match = filename.match(regexp);
  if (!match)
    return;
  let mimeType = mimes[match[1]];
  if (mimeType && mimeType.startsWith("text") || mimeType === "application/json") {
    mimeType += "; charset=utf-8";
  }
  return mimeType;
};
var mimes = {
  aac: "audio/aac",
  abw: "application/x-abiword",
  arc: "application/x-freearc",
  avi: "video/x-msvideo",
  azw: "application/vnd.amazon.ebook",
  bin: "application/octet-stream",
  bmp: "image/bmp",
  bz: "application/x-bzip",
  bz2: "application/x-bzip2",
  csh: "application/x-csh",
  css: "text/css",
  csv: "text/csv",
  doc: "application/msword",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  eot: "application/vnd.ms-fontobject",
  epub: "application/epub+zip",
  gz: "application/gzip",
  gif: "image/gif",
  htm: "text/html",
  html: "text/html",
  ico: "image/x-icon",
  ics: "text/calendar",
  jar: "application/java-archive",
  jpeg: "image/jpeg",
  jpg: "image/jpeg",
  js: "text/javascript",
  json: "application/json",
  jsonld: "application/ld+json",
  map: "application/json",
  mid: "audio/x-midi",
  midi: "audio/x-midi",
  mjs: "text/javascript",
  mp3: "audio/mpeg",
  mpeg: "video/mpeg",
  mpkg: "application/vnd.apple.installer+xml",
  odp: "application/vnd.oasis.opendocument.presentation",
  ods: "application/vnd.oasis.opendocument.spreadsheet",
  odt: "application/vnd.oasis.opendocument.text",
  oga: "audio/ogg",
  ogv: "video/ogg",
  ogx: "application/ogg",
  opus: "audio/opus",
  otf: "font/otf",
  png: "image/png",
  pdf: "application/pdf",
  php: "application/php",
  ppt: "application/vnd.ms-powerpoint",
  pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  rar: "application/vnd.rar",
  rtf: "application/rtf",
  sh: "application/x-sh",
  svg: "image/svg+xml",
  swf: "application/x-shockwave-flash",
  tar: "application/x-tar",
  tif: "image/tiff",
  tiff: "image/tiff",
  ts: "video/mp2t",
  ttf: "font/ttf",
  txt: "text/plain",
  vsd: "application/vnd.visio",
  wav: "audio/wav",
  weba: "audio/webm",
  webm: "video/webm",
  webp: "image/webp",
  woff: "font/woff",
  woff2: "font/woff2",
  xhtml: "application/xhtml+xml",
  xls: "application/vnd.ms-excel",
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  xml: "application/xml",
  xul: "application/vnd.mozilla.xul+xml",
  zip: "application/zip",
  "3gp": "video/3gpp",
  "3g2": "video/3gpp2",
  "7z": "application/x-7z-compressed"
};

// node_modules/hono/dist/middleware/serve-static/bun.js
var { file } = Bun;
var DEFAULT_DOCUMENT = "index.html";
var serveStatic = (options = { root: "" }) => {
  return async (c, next) => {
    if (c.finalized) {
      await next();
      return;
    }
    const url = new URL(c.req.url);
    let path = getFilePath({
      filename: options.path ?? url.pathname,
      root: options.root,
      defaultDocument: DEFAULT_DOCUMENT
    });
    path = `./${path}`;
    if (existsSync(path)) {
      const content = file(path);
      if (content) {
        const mimeType = getMimeType(path);
        if (mimeType) {
          c.header("Content-Type", mimeType);
        }
        return c.body(content);
      }
    }
    console.warn(`Static file: ${path} is not found`);
    await next();
    return;
  };
};

// src/api/createUser.ts
import * as crypto from "node:crypto";
var generateID = function() {
  let result = "";
  let characters = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let charactersLength = characters.length;
  for (let i = 0; i < 8; i++) {
    result += characters.charAt(Math.floor(Math.random() * charactersLength));
  }
  return result;
};
var generateAvatarURL = function() {
  let accessoriesType = ["Blank", "Kurt", "Prescription01", "Prescription02", "Round", "Sunglasses", "Wayfarers"];
  let clotheType = ["BlazerShirt", "BlazerSweater", "CollarSweater", "GraphicShirt", "Hoodie", "Overall", "ShirtCrewNeck", "ShirtScoopNeck", "ShirtVNeck"];
  let eyeType = ["Close", "Cry", "Default", "Dizzy", "EyeRoll", "Happy", "Hearts", "Side", "Squint", "Surprised", "Wink", "WinkWacky"];
  let eyebrowType = ["Angry", "AngryNatural", "Default", "DefaultNatural", "FlatNatural", "RaisedExcited", "RaisedExcitedNatural", "SadConcerned", "SadConcernedNatural", "UnibrowNatural", "UpDown", "UpDownNatural"];
  let facialHairType = ["Blank", "BeardMedium", "BeardLight", "BeardMagestic", "MoustacheFancy", "MoustacheMagnum"];
  let hairColor = ["Auburn", "Black", "Blonde", "BlondeGolden", "Brown", "BrownDark", "PastelPink", "Platinum", "Red", "SilverGray"];
  let mouthType = ["Concerned", "Default", "Disbelief", "Eating", "Grimace", "Sad", "ScreamOpen", "Serious", "Smile", "Tongue", "Twinkle", "Vomit"];
  let skinColor = ["Tanned", "Yellow", "Pale", "Light", "Brown", "DarkBrown", "Black"];
  let topType = ["NoHair", "Eyepatch", "Hat", "Hijab", "Turban", "WinterHat1", "WinterHat2", "WinterHat3", "WinterHat4", "LongHairBigHair", "LongHairBob", "LongHairBun", "LongHairCurly", "LongHairCurvy", "LongHairDreads", "LongHairFrida", "LongHairFro", "LongHairFroBand", "LongHairNotTooLong", "LongHairShavedSides", "LongHairMiaWallace", "LongHairStraight", "LongHairStraight2", "LongHairStraightStrand", "ShortHairDreads01", "ShortHairDreads02", "ShortHairFrizzle", "ShortHairShaggyMullet", "ShortHairShortCurly", "ShortHairShortFlat", "ShortHairShortRound", "ShortHairShortWaved", "ShortHairSides", "ShortHairTheCaesar", "ShortHairTheCaesarSidePart"];
  let avatarURL = "https://avataaars.io/?avatarStyle=Circle&topType=" + topType[Math.floor(Math.random() * topType.length)] + "&accessoriesType=" + accessoriesType[Math.floor(Math.random() * accessoriesType.length)] + "&hairColor=" + hairColor[Math.floor(Math.random() * hairColor.length)] + "&facialHairType=" + facialHairType[Math.floor(Math.random() * facialHairType.length)] + "&clotheType=" + clotheType[Math.floor(Math.random() * clotheType.length)] + "&eyeType=" + eyeType[Math.floor(Math.random() * eyeType.length)] + "&eyebrowType=" + eyebrowType[Math.floor(Math.random() * eyebrowType.length)] + "&mouthType=" + mouthType[Math.floor(Math.random() * mouthType.length)] + "&skinColor=" + skinColor[Math.floor(Math.random() * skinColor.length)];
  return avatarURL;
};
async function createUser_default(c, db2) {
  let body;
  try {
    body = await c.req.json();
  } catch (e) {
    return new Response(JSON.stringify({ success: false, error: "Parse Error" }), {
      status: 400
    });
  }
  const { name, email, password } = body;
  console.log("Asking to create user", name, email, password);
  if (!name || !email || !password) {
    return new Response(JSON.stringify({ success: false, error: "Missing data" }), {
      status: 400
    });
  }
  let userExists = await db2.query("SELECT * FROM user WHERE username = $name OR email = $email", {
    name,
    email
  });
  if (userExists[0].result.length > 0) {
    console.log(userExists);
    return new Response(JSON.stringify({ success: false, error: "User already exists" }), {
      status: 400
    });
  }
  let salt = crypto.randomBytes(16).toString("hex");
  let hash = crypto.pbkdf2Sync(password, salt, 1e3, 64, "sha512").toString("hex");
  let userCreated = await db2.create("user", {
    username: name,
    id: "user-" + generateID(),
    email,
    salt,
    hash,
    avatarURL: generateAvatarURL()
  });
  console.log(userCreated);
  return new Response(JSON.stringify({ success: true, token: userCreated.hash }), {
    status: 200
  });
}

// src/api/getToken.ts
import * as crypto2 from "node:crypto";
async function getToken_default(c, db2) {
  let body, password, email;
  try {
    body = await c.req.json();
    password = body.password;
    email = body.email;
  } catch (e) {
    return new Response(JSON.stringify({ success: false, error: "Parse Error" }), {
      status: 400
    });
  }
  if (!password) {
    return new Response(JSON.stringify({ success: false, error: "No password" }), {
      status: 400
    });
  }
  if (!email) {
    return new Response(JSON.stringify({ success: false, error: "No email" }), {
      status: 400
    });
  }
  let user = await db2.query("SELECT * FROM user WHERE email = $email", { email });
  if (user[0].result.length === 0) {
    return new Response(JSON.stringify({ success: false, error: "Invalid email" }), {
      status: 400
    });
  }
  user = user[0].result[0];
  let hash = user.hash;
  let salt = user.salt;
  let inputHash = crypto2.pbkdf2Sync(password, salt, 1e3, 64, "sha512").toString("hex");
  if (inputHash !== hash) {
    return new Response(JSON.stringify({ success: false, error: "Invalid password" }), {
      status: 400
    });
  }
  return new Response(JSON.stringify({ success: true, token: hash }), {
    status: 200
  });
}

// src/api/getUser.ts
async function getUser_default(c, db2) {
  let token = c.req.query("token");
  if (!token) {
    return new Response(JSON.stringify({ success: false, error: "No Token" }), {
      status: 400
    });
  }
  let user = await db2.query("SELECT * FROM user WHERE hash = $token", { token });
  if (user[0].result.length === 0) {
    return new Response(JSON.stringify({ success: false, error: "Invalid Token" }), {
      status: 400
    });
  }
  user = user[0].result[0];
  return new Response(JSON.stringify({ success: true, user }), {
    status: 200
  });
}

// index.tsx
var app = new Hono();
var db = new Surreal("http://127.0.0.1:8000/rpc");
await db.signin({
  user: "root",
  pass: "root"
});
await db.use("test", "test");
console.log("[DB] Connected to SurrealDB");
app.use("*", logger());
app.get("/", async (c) => {
  return await main(c, db);
});
app.get("/login", main2);
app.get("/signup", main3);
app.post("/api/createUser", async (c) => {
  return await createUser_default(c, db);
});
app.get("/api/getUser", async (c) => {
  return await getUser_default(c, db);
});
app.post("/api/getToken", async (c) => {
  return await getToken_default(c, db);
});
app.get("/api", api_default);
app.get("/build.css", serveStatic({ path: "./build.css" }));
app.get("/fix.js", serveStatic({ path: "./fix.js" }));
var blogit_default = {
  port: 3e3,
  fetch: app.fetch
};
console.log("Server is running at http://localhost:3000");
export {
  blogit_default as default
};
