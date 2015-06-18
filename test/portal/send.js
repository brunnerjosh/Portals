describe('Portal#send()', function () {

  // test instance
  var web;

  /**
   * @beforeEach
   */
  beforeEach(function () {
    // instantiate a new portal instance
    web = new portals.Portal();
  });

  /**
   * @test
   */
  it('throws an error if options is not an object', function () {
    expect(function () {
      web.send();
    }).to.throw('Options must be an object!');
  });

  /**
   * @test
   */
  it('sends a simple GET request', function (done) {
    var opts = { method: 'GET', url: '/' };
    var data = JSON.stringify({ foo: 'bar' });
    var promise = web.send(opts);

    // set up the fake response
    this.requests[0].respond(200, {}, data);

    // proceed with promise resolution
    promise.then(function (res) {
      expect(res.status).to.equal(200);
      expect(res.body).to.equal(data);
      done();
    });
  });

});
