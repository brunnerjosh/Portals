"use strict";

(function() {
  var root = this;

  if (typeof Promise === 'undefined') {
    if (typeof require === 'function') {
      var Promise = require('promise/lib/es6-extensions');
    }
    else {
      throw new Error('Portals requires "Promise" support');
    }
  }

  /**
   * Validates request options and ensures URL and method are provided.
   *
   * @param  {Object} options
   * @return {Object}
   */
  var validateRequestInterceptor = function (options) {
    // ensure method is present and a string
    if (typeof options.method !== 'string') {
      throw new Error('Invalid method provided');
    }

    // ensure url is present and a string
    if (typeof options.url !== 'string') {
      throw new Error('Invalid url provided');
    }

    return options
  }

  /**
   * Merges globals into each request.
   *
   * @param  {Object} options
   * @return {Object}
   */
  var mergeGlobalsRequestInterceptor = function (options) {

    // TODO merge the globals into the options
    options.headers = this.globals.headers;

    return options;
  }

  /**
   * Builds up the URL using the hostname, params and query.
   *
   * @param  {Object} options
   * @return {Object}
   */
  var buildUrlRequestInterceptor = function (options) {
    // if "http" is not present in url, add the hostname
    if (options.url.indexOf('http') !== 0) {
      options.url = (options.hostname || '') + options.url;
    }

    // TODO replace parameters in URL
    // TODO build query string from query object

    return options;
  }

  /**
   * Encodes the request body as JSON.
   *
   * @param  {Object} options
   * @return {Object}
   */
  var encodeJsonRequestInterceptor = function (options) {
    if (options.data
        && typeof options.headers['Content-Type'] === 'string'
        && options.headers['Content-Type'].indexOf('json') !== -1) {
      options.data = JSON.stringify(options.data);
    }

    return options;
  }

  /**
   * Parses the response if JSON.
   *
   * @param  {Object} response
   * @return {Object}
   */
  var parseJsonResponseInterceptor = function (response) {
    if (response.headers['Content-Type']
        && response.headers['Content-Type'].indexOf('json') !== -1) {
      response.body = JSON.parse(response.body);
    }

    return response;
  }

  /**
   * Constructor: Generate a new "Portal" instance.
   */
  var Portal = function () {
    this.globals = {
      hostname: '',
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      }
    };

    this._requestInterceptors = [
      validateRequestInterceptor
    ];

    this._responseInterceptors = [];
  }

  /**
   * Send a request to the server using the given details in the
   * options object.  Inherits base object from the set globals.
   *
   * @param  {Object} options
   * @return {Promise}
   */
  Portal.prototype.send = function (opts) {
    // ensure that an object is given
    if (typeof opts !== 'object') {
      throw new Error('Options must be an object!');
    }

    // loop through the request interceptors
    for (var i = 0; i < this._requestInterceptors.length; i++) {
      opts = this._requestInterceptors[i].call(this, opts)

      // make sure that the options object is still an object
      if (typeof opts !== 'object') {
        throw new Error('Options object is no longer an object after interception!');
      }
    }

    // prepare the request
    var self = this;
    var xhr = new XMLHttpRequest();

    xhr.open(opts.method.toUpperCase(), opts.url, true);

    var promise = new Promise(function (resolve, reject) {
      xhr.onreadystatechange = function () {
        if (xhr.readyState === 4) {
          var response = {
            status: this.status,
            headers: this.responseHeaders,
            body: this.responseText
          };

          // loop through the response interceptors
          for (var i = 0; i < self._responseInterceptors.length; i++) {
            response = self._responseInterceptors[i].call(self, response)

            // make sure that the options object is still an object
            if (typeof response !== 'object') {
              throw new Error('Response object is no longer an object after interception!');
            }
          }

          if (this.status === 200) resolve(response);
          else reject(response);
        }
      }
    });

    // add the headers to the request
    for (var key in opts.headers) {
      xhr.setRequestHeader(key, opts.headers[key]);
    }

    xhr.send(opts.data || opts.body || null);

    return promise;
  }

  /**
   * Helper for making GET requests.
   *
   * @param  {String} url
   * @return {Promise}
   */
  Portal.prototype.get = function (url) {
    return this.send({
      method: 'GET',
      url: url
    });
  }

  /**
   * Helper for making POST requests.
   *
   * @param  {String} url
   * @param  {Object} data
   * @return {Promise}
   */
  Portal.prototype.post = function (url, data) {
    return this.send({
      method: 'POST',
      url: url,
      data: data
    });
  }

  /**
   * Helper for making PUT requests.
   *
   * @param  {String} url
   * @param  {Object} data
   * @return {Promise}
   */
  Portal.prototype.put = function (url, data) {
    return this.send({
      method: 'PUT',
      url: url,
      data: data
    });
  }

  /**
   * Helper for making DELETE requests.
   *
   * @param  {String} url
   * @return {Promise}
   */
  Portal.prototype.del = function (url) {
    return this.send({
      method: 'DELETE',
      url: url
    });
  }

  /**
   * Adds all the default interceptors to the instance.
   *
   * @return {this}
   */
  Portal.prototype.useDefaultInterceptors = function () {
    return this
      .onRequest(mergeGlobalsRequestInterceptor)
      .onRequest(buildUrlRequestInterceptor)
      .onRequest(encodeJsonRequestInterceptor)
      .onResponse(parseJsonResponseInterceptor);
  }

  /**
   * Add new request interceptor.
   *
   * @param  {Function} fn
   * @return {this}
   */
  Portal.prototype.onRequest = function (fn) {
    // ensure that interceptor is function
    if (typeof fn !== 'function') {
      throw new Error('Interceptor must be a function!');
    }

    // add the interceptor to the list
    this._requestInterceptors.push(fn);

    return this;
  }

  /**
   * Add new response interceptor.
   *
   * @param  {Function} fn
   * @return {this}
   */
  Portal.prototype.onResponse = function (fn) {
    // ensure that interceptor is function
    if (typeof fn !== 'function') {
      throw new Error('Interceptor must be a function!');
    }

    // add the interceptor to the list
    this._responseInterceptors.push(fn);

    return this;
  }

  /**
   * Factory method that creates a new Portal instance with the
   * default interceptors.
   *
   * @return {Portal}
   */
  var factory = function () {
    var port = new Portal();

    port.useDefaultInterceptors();

    return port;
  }

  /**
   * EXPORT
   * Export via CommonJS or attach it to the window.
   */
  var portals = {
    create: factory,
    Portal: Portal,
    interceptors: {
      validateRequest: validateRequestInterceptor,
      mergeGlobalsRequest: mergeGlobalsRequestInterceptor,
      buildUrlRequest: buildUrlRequestInterceptor,
      encodeJsonRequest: encodeJsonRequestInterceptor,
      parseJsonResponse: parseJsonResponseInterceptor
    }
  };

  if (typeof exports !== 'undefined') {
    if (typeof module !== 'undefined' && module.exports) {
      exports = module.exports = portals
    }
    exports.portals = portals
  }
  else {
    root.portals = portals
  }

}).call(this)
